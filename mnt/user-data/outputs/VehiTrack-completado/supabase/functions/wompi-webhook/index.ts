// ================================================================
//  VEHITRACK · Edge Function "wompi-webhook"
//  ----------------------------------------------------------------
//  Recibe el evento "transaction.updated" de Wompi para las consultas
//  pagadas individualmente (referencia CONS-...): al aprobarse el
//  pago, llama a PlacApi y deja el informe listo para que el
//  frontend lo recoja (ver `informe-estado`).
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
//    PLACAPI_API_KEY       (para armar el informe)
//
//  Desplegar:  supabase functions deploy wompi-webhook --no-verify-jwt
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { armarInforme } from "../_shared/placapi.ts";

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
  const concatenado = props.map((p) => String(leerRuta(body, p))).join("") + String(body.timestamp) + eventsSecret;
  const calculado = await sha256hex(concatenado);
  return calculado.toUpperCase() === String(checksumRecibido).toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  try {
    const body = await req.json();

    const eventsSecret = Deno.env.get("WOMPI_EVENTS_SECRET");
    if (!eventsSecret) {
      console.warn("WOMPI_EVENTS_SECRET no configurado: el checksum del evento NO se está validando.");
    } else if (!(await checksumValido(body, eventsSecret))) {
      return json({ error: "checksum_invalido" }, 401);
    }

    const tx = body?.data?.transaction;
    if (!tx?.reference || !tx?.status) return json({ error: "payload_incompleto" }, 400);

    const ref: string = tx.reference;
    const estado: string = tx.status; // APPROVED | DECLINED | VOIDED | ERROR | PENDING
    const txnId: string = tx.id;
    const aprobado = estado === "APPROVED";
    const fallido = estado === "DECLINED" || estado === "VOIDED" || estado === "ERROR";

    if (!ref.startsWith("CONS-")) return json({ ok: true, ignorado: true });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (aprobado) {
      const { data: pend } = await admin.from("consultas_pendientes")
        .update({ estado: "pagado", wompi_txn_id: txnId, updated_at: new Date().toISOString() })
        .eq("reference", ref).eq("estado", "pendiente")
        .select("id, user_id, placa, doc_type, doc_number, primer_apellido, ciudad, tipo").maybeSingle();
      if (pend) {
        try {
          const informe = await armarInforme(pend.tipo, pend.placa, pend.doc_type, pend.doc_number, pend.primer_apellido, pend.ciudad);
          const { data: c } = await admin.from("consultas").insert({
            user_id: pend.user_id, placa: pend.placa, doc_type: pend.doc_type, doc_number: pend.doc_number,
            payload: informe, source: "placapi", costo: 0,
          }).select("id").single();
          await admin.from("consultas_pendientes").update({
            estado: "listo", informe_id: c!.id, updated_at: new Date().toISOString(),
          }).eq("id", pend.id);
        } catch (e) {
          // Pagó, pero PlacApi falló: se deja "pagado" (no "listo") para
          // poder reintentar/reembolsar manualmente; no se pierde el pago.
          console.error("Error armando informe tras pago aprobado:", e);
        }
      }
    } else if (fallido) {
      await admin.from("consultas_pendientes").update({ estado: "rechazado", wompi_txn_id: txnId, updated_at: new Date().toISOString() })
        .eq("reference", ref).eq("estado", "pendiente");
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: "error_interno", detalle: String(e) }, 500);
  }
});
