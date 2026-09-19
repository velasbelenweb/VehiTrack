// ================================================================
//  VEHITRACK · Edge Function "bold-webhook"
//  ----------------------------------------------------------------
//  Recibe la notificación de Bold cuando un pago cambia de estado y
//  acredita:
//   - Recargas de wallet    (referencia AFV-...)
//   - Cobros de suscripción (referencia SUB-...): activa/renueva o
//     marca la suscripción como morosa.
//  Idempotente: solo actúa una vez por referencia (usa .eq('estado','pendiente')).
//
//  ⚠️ NO VERIFICADO — ajusta antes de producción:
//  No tengo acceso confiable y actualizado a la documentación del
//  webhook de Bold (nombre exacto de los campos del payload, cómo
//  firma/autentica sus notificaciones). Lo de abajo es una plantilla
//  razonable, no una integración confirmada:
//   1) Configura la URL del webhook en tu panel de Bold y dispara un
//      pago de prueba; revisa en los logs de esta función
//      (supabase functions logs bold-webhook) el payload real.
//   2) Ajusta `leerEvento` para que lea los campos con los nombres
//      reales que envía Bold (status, reference/order id, txn id).
//   3) Si Bold firma sus webhooks (header tipo x-bold-signature o
//      similar), agrega aquí la verificación antes de confiar en el
//      payload — tal como se validaba antes con el checksum del proveedor anterior.
//      Sin esa verificación, cualquiera podría llamar a esta URL y
//      simular un pago aprobado: no lo dejes así en producción.
//
//  Desplegar:  supabase functions deploy bold-webhook --no-verify-jwt
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });

function sumarUnMes(fecha: string) {
  const d = new Date(fecha + "T00:00:00Z");
  const hoy = new Date();
  const base = d > hoy ? d : hoy; // no acumular meses vencidos
  base.setUTCMonth(base.getUTCMonth() + 1);
  return base.toISOString().slice(0, 10);
}

// TODO: reemplaza esto por la lectura real del payload de Bold una
// vez confirmes su forma exacta (ver aviso arriba).
function leerEvento(body: any) {
  return {
    reference: body?.reference ?? body?.data?.reference ?? body?.data?.metadata?.reference ?? "",
    estado: body?.status ?? body?.data?.status ?? body?.data?.object?.status ?? "",
    txnId: body?.id ?? body?.data?.id ?? body?.data?.payment_id ?? "",
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  try {
    // TODO: verifica aquí la firma/autenticidad del webhook de Bold
    // (secreto compartido en un header, por ejemplo) antes de confiar
    // en el payload. Sin esto, la función queda abierta a que
    // cualquiera simule un pago aprobado.
    const webhookSecretConfigurado = !!Deno.env.get("BOLD_WEBHOOK_SECRET");
    if (!webhookSecretConfigurado) {
      console.warn("BOLD_WEBHOOK_SECRET no configurado: la firma del webhook NO se está validando.");
    }

    const body = await req.json();
    const { reference: ref, estado, txnId } = leerEvento(body);
    if (!ref) return json({ error: "payload_incompleto" }, 400);

    const aprobado = /APPROVED|APROBAD|PAID|SUCCESS/i.test(estado);
    const fallido = /DECLINED|REJECT|RECHAZAD|ERROR|VOID|FAIL/i.test(estado);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (ref.startsWith("SUB-")) {
      // ── Cobro de suscripción ──
      if (aprobado) {
        const { data: cobro } = await admin.from("cobros")
          .update({ estado: "aprobado", bold_txn_id: txnId, updated_at: new Date().toISOString() })
          .eq("reference", ref).eq("estado", "pendiente")
          .select("user_id, creditos, suscripcion_id").maybeSingle();
        if (cobro) {
          await admin.rpc("sumar_creditos", { p_user: cobro.user_id, p_creditos: cobro.creditos });
          const { data: sub } = await admin.from("suscripciones").select("proximo_cobro").eq("id", cobro.suscripcion_id).maybeSingle();
          await admin.from("suscripciones").update({
            estado: "activa", retry_count: 0,
            proximo_cobro: sumarUnMes(sub?.proximo_cobro ?? new Date().toISOString().slice(0, 10)),
            updated_at: new Date().toISOString(),
          }).eq("id", cobro.suscripcion_id);
        }
      } else if (fallido) {
        const { data: cobro } = await admin.from("cobros")
          .update({ estado: "rechazado", bold_txn_id: txnId, updated_at: new Date().toISOString() })
          .eq("reference", ref).eq("estado", "pendiente")
          .select("suscripcion_id").maybeSingle();
        if (cobro) await admin.rpc("marcar_morosa", { p_sub: cobro.suscripcion_id });
      }
    } else {
      // ── Recarga de wallet ──
      if (aprobado) {
        const { data: rec } = await admin.from("recargas")
          .update({ estado: "aprobada", bold_txn_id: txnId, updated_at: new Date().toISOString() })
          .eq("reference", ref).eq("estado", "pendiente")
          .select("user_id, creditos").maybeSingle();
        if (rec) await admin.rpc("sumar_creditos", { p_user: rec.user_id, p_creditos: rec.creditos });
      } else if (fallido) {
        await admin.from("recargas").update({ estado: "rechazada", bold_txn_id: txnId, updated_at: new Date().toISOString() })
          .eq("reference", ref).eq("estado", "pendiente");
      }
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: "error_interno", detalle: String(e) }, 500);
  }
});
