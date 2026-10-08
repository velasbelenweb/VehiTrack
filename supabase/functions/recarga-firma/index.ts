// ================================================================
//  VEHITRACK · Edge Function "recarga-firma"
//  ----------------------------------------------------------------
//  Genera la referencia y la firma de integridad para que el usuario
//  recargue su wallet en el checkout hospedado de Wompi. El webhook
//  (`wompi-webhook`) es quien, al confirmar el pago, abona el saldo.
//  El monto se acredita 1:1 (lo que paga es lo que queda de saldo).
//
//  Fórmula de la firma de integridad de Wompi:
//    sha256hex( `${reference}${amountInCents}${currency}${integritySecret}` )
//
//  Variables de entorno requeridas (Supabase → Edge Functions → Secrets):
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (las inyecta Supabase)
//    WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_SECRET
//
//  Desplegar:  supabase functions deploy recarga-firma
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { registrarEvento } from "../_shared/eventos.ts";

const ORIGENES = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://vehitrack.app,https://www.vehitrack.app").split(",").map((s) => s.trim());
function corsPara(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0],
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}


// Montos de recarga permitidos (pesos). Ajusta libremente la lista.
const MONTOS_VALIDOS = [5000, 10000, 20000, 50000, 100000];

async function sha256hex(str: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const CORS = corsPara(req);
  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...CORS } });
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
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const monto = Number(body?.monto);
    if (!MONTOS_VALIDOS.includes(monto)) return json({ error: "monto_invalido" }, 400);

    const publicKey = Deno.env.get("WOMPI_PUBLIC_KEY");
    const secret = Deno.env.get("WOMPI_INTEGRITY_SECRET");
    if (!publicKey || !secret) return json({ error: "wompi_no_configurado" }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const reference = `AFV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const amountInCents = monto * 100;

    const { error: insErr } = await admin.from("recargas").insert({
      user_id: userId, reference, monto_cents: amountInCents, estado: "pendiente",
    });
    if (insErr) {
      console.error("recargas insert:", insErr.message);
      await registrarEvento(admin, "error", "recarga_no_creada", userId, { motivo: insErr.message });
      return json({ error: "error_interno" }, 500);
    }

    const signature = await sha256hex(`${reference}${amountInCents}COP${secret}`);
    return json({ reference, amountInCents, publicKey, signature });
  } catch (e) {
    console.error(e);
    return json({ error: "error_interno" }, 500);
  }
});
