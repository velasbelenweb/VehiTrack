// ================================================================
//  VEHITRACK · Edge Function "consulta-firma"
//  ----------------------------------------------------------------
//  Cada consulta se paga directo con Wompi (sin wallet ni planes):
//  Básico $5.000 · Avanzado $10.000. Esta función crea la solicitud
//  pendiente y devuelve la firma de integridad para el checkout
//  hospedado de Wompi. El webhook (`wompi-webhook`) es quien, al
//  confirmar el pago, llama a PlacApi y deja el informe listo.
//
//  Variables de entorno requeridas (Supabase → Edge Functions → Secrets):
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (las inyecta Supabase)
//    WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_SECRET
//
//  Desplegar:  supabase functions deploy consulta-firma
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...CORS } });

const PRECIOS: Record<string, number> = { basico: 5000, avanzado: 10000 }; // pesos (no centavos)

async function sha256hex(str: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await anon.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "no_autenticado" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const tipo: string = (body?.tipo === "avanzado") ? "avanzado" : "basico";
    const placa: string = (body?.placa ?? "").toString().trim().toUpperCase();
    const docType: string | undefined = body?.docType;
    const docNumber: string | undefined = body?.docNumber;
    const primerApellido: string | undefined = body?.primerApellido;
    const ciudad: string | undefined = body?.ciudad;
    if (!placa) return json({ error: "placa_requerida" }, 400);

    const publicKey = Deno.env.get("WOMPI_PUBLIC_KEY");
    const secret = Deno.env.get("WOMPI_INTEGRITY_SECRET");
    if (!publicKey || !secret) return json({ error: "wompi_no_configurado" }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const monto = PRECIOS[tipo];
    const reference = `CONS-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const amountInCents = monto * 100;

    const { error: insErr } = await admin.from("consultas_pendientes").insert({
      user_id: user.id, reference, placa, doc_type: docType, doc_number: docNumber,
      primer_apellido: primerApellido, ciudad, tipo, amount_cents: amountInCents, estado: "pendiente",
    });
    if (insErr) return json({ error: "error_interno", detalle: insErr.message }, 500);

    const signature = await sha256hex(`${reference}${amountInCents}COP${secret}`);
    return json({ reference, amountInCents, publicKey, signature });
  } catch (e) {
    return json({ error: "error_interno", detalle: String(e) }, 500);
  }
});
