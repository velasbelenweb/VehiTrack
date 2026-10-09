// ================================================================
//  VEHITRACK · Edge Function "wompi-webhook"
//  ----------------------------------------------------------------
//  Recibe el evento "transaction.updated" de Wompi para las recargas
//  de wallet (referencia AFV-...): al aprobarse el pago, abona el
//  saldo correspondiente al usuario.
//
//  Valida el checksum del evento con el "Events Secret" de Wompi
//  antes de confiar en el payload (así nadie puede simular un pago
//  aprobado llamando directo a esta URL).
//
//  Checksum de eventos de Wompi:
//    sha256hex( valores_de_signature.properties_en_orden + timestamp + eventsSecret )
//  donde cada "propiedad" se lee del payload siguiendo su ruta
//  (ej. "data.transaction.id" → body.data.transaction.id).
//
//  Variables de entorno requeridas (Supabase → Edge Functions → Secrets):
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (las inyecta Supabase)
//    WOMPI_EVENTS_SECRET   (Wompi → Configuración → Llaves → Events secret)
//
//  Desplegar:  supabase functions deploy wompi-webhook --no-verify-jwt
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { registrarEvento } from "../_shared/eventos.ts";

const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });

function leerRuta(obj: any, ruta: string) {
  return ruta.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

async function sha256hex(str: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function checksumValido(body: any, eventsSecret: string) {
  const props: string[] = body?.signature?.properties;
  const checksumRecibido: string = body?.signature?.checksum;
  if (!props || !checksumRecibido) return false;
  // Las rutas en signature.properties son relativas a "data" (ej. "transaction.id"),
  // no a la raíz del payload — confirmado con un ejemplo real de Wompi.
  const concatenado = props.map((p) => String(leerRuta(body.data, p))).join("") + String(body.timestamp) + eventsSecret;
  const calculado = await sha256hex(concatenado);
  const a = calculado.toUpperCase(), b = String(checksumRecibido).toUpperCase();
  if (a.length !== b.length) return false;
  let diff = 0; // comparación en tiempo constante
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  try {
    const body = await req.json();

    const eventsSecret = Deno.env.get("WOMPI_EVENTS_SECRET");
    if (!eventsSecret) {
      // Fallar CERRADO: sin el secreto no hay forma de verificar que el
      // pago sea real, así que se rechaza en vez de confiar a ciegas.
      console.error("WOMPI_EVENTS_SECRET no configurado: rechazando el webhook por seguridad.");
      await registrarEvento(admin, "error", "webhook_sin_secreto", null, {});
      return json({ error: "webhook_no_configurado" }, 500);
    }
    if (!(await checksumValido(body, eventsSecret))) {
      // Tope anti-spam: este endpoint es público, no llenamos la tabla si lo bombardean.
      const { count } = await admin.from("eventos").select("id", { count: "exact", head: true })
        .eq("tipo", "webhook_checksum_invalido").gte("created_at", new Date(Date.now() - 60_000).toISOString());
      if ((count ?? 0) < 10) await registrarEvento(admin, "error", "webhook_checksum_invalido", null, { reference: body?.data?.transaction?.reference ?? null });
      return json({ error: "checksum_invalido" }, 401);
    }

    const tx = body?.data?.transaction;
    if (!tx?.reference || !tx?.status) {
      await registrarEvento(admin, "warn", "webhook_payload_incompleto", null, {});
      return json({ error: "payload_incompleto" }, 400);
    }

    const ref: string = tx.reference;
    const estado: string = tx.status; // APPROVED | DECLINED | VOIDED | ERROR | PENDING
    const txnId: string = tx.id;
    const aprobado = estado === "APPROVED";
    const fallido = estado === "DECLINED" || estado === "VOIDED" || estado === "ERROR";

    if (!ref.startsWith("AFV-")) return json({ ok: true, ignorado: true });

    if (aprobado) {
      const { data: rec } = await admin.from("recargas")
        .update({ estado: "aprobada", wompi_txn_id: txnId, updated_at: new Date().toISOString() })
        .eq("reference", ref).eq("estado", "pendiente")
        .select("user_id, monto_cents").maybeSingle();
      if (rec) {
        const { error: sumErr } = await admin.rpc("sumar_creditos", { p_user: rec.user_id, p_creditos: Math.round(rec.monto_cents / 100) });
        if (sumErr) {
          // La recarga quedó 'aprobada' pero el saldo no se abonó: hay que acreditarlo a mano desde el panel.
          console.error("sumar_creditos:", sumErr.message);
          await registrarEvento(admin, "error", "abono_fallido", rec.user_id, { reference: ref, monto: Math.round(rec.monto_cents / 100), motivo: sumErr.message });
          return json({ error: "abono_fallido" }, 500);
        }
        await registrarEvento(admin, "info", "recarga_aprobada", rec.user_id, { reference: ref, monto: Math.round(rec.monto_cents / 100) });
      } else {
        // Sin fila pendiente: o es un evento repetido (normal) o la referencia no existe (raro).
        const { data: existe } = await admin.from("recargas").select("estado").eq("reference", ref).maybeSingle();
        if (!existe) await registrarEvento(admin, "error", "pago_aprobado_sin_recarga", null, { reference: ref, wompi_txn: txnId });
      }
    } else if (fallido) {
      const { data: rech } = await admin.from("recargas").update({ estado: "rechazada", wompi_txn_id: txnId, updated_at: new Date().toISOString() })
        .eq("reference", ref).eq("estado", "pendiente").select("user_id").maybeSingle();
      if (rech) await registrarEvento(admin, "info", "recarga_rechazada", rech.user_id, { reference: ref, estado });
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    await registrarEvento(admin, "error", "webhook_error_interno", null, { motivo: String((e as Error)?.message ?? e).slice(0, 200) });
    return json({ error: "error_interno" }, 500);
  }
});
