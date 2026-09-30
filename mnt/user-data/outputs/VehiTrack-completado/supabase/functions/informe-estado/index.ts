// ================================================================
//  VEHITRACK · Edge Function "informe-estado"
//  ----------------------------------------------------------------
//  El frontend la llama después de volver del checkout de Wompi
//  (con la referencia que guardó antes de redirigir), para saber si
//  el pago ya se confirmó y el informe está listo.
//
//  Desplegar:  supabase functions deploy informe-estado
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...CORS } });

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

    const body = await req.json().catch(() => ({}));
    const reference: string = body?.reference;
    if (!reference) return json({ error: "referencia_requerida" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: pend } = await admin.from("consultas_pendientes")
      .select("estado, informe_id, user_id").eq("reference", reference).maybeSingle();
    if (!pend || pend.user_id !== userData.user.id) return json({ error: "no_encontrado" }, 404);

    if (pend.estado === "listo" && pend.informe_id) {
      const { data: c } = await admin.from("consultas").select("payload").eq("id", pend.informe_id).maybeSingle();
      return json({ estado: "listo", informe: c?.payload ?? null });
    }
    return json({ estado: pend.estado });
  } catch (e) {
    return json({ error: "error_interno", detalle: String(e) }, 500);
  }
});
