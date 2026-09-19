// ================================================================
//  VEHITRACK · Edge Function "suscribir"
//  ----------------------------------------------------------------
//  Crea la suscripción (estado 'pendiente') y el primer registro en
//  `cobros`, y devuelve los datos firmados para que el frontend
//  muestre el botón de pagos de Bold y el usuario complete el pago.
//  El webhook (`bold-webhook`) es quien marca el cobro como aprobado
//  y activa la suscripción cuando Bold confirma el pago.
//
//  ⚠️ LIMITACIÓN IMPORTANTE — revisar antes de producción:
//  Esta función solo resuelve el PRIMER cobro (vía botón de pagos,
//  igual que una recarga). No implementa cobro recurrente automático
//  ("cliente guardado"/autodebit) porque no tengo información
//  verificada del mecanismo real de Bold para cobros recurrentes.
//  Antes de lanzar suscripciones en producción:
//   1) Confirma con la documentación oficial de Bold (o su soporte)
//      cuál es su API de cobro recurrente / tokenización de cliente.
//   2) Si Bold no ofrece eso, la alternativa simple es generar un
//      nuevo enlace de pago cada mes (con un cron/Scheduled Function)
//      y notificar al usuario para que lo pague, en vez de un
//      débito silencioso.
//
//  Variables de entorno requeridas (Supabase → Edge Functions → Secrets):
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (las inyecta Supabase)
//    BOLD_API_KEY, BOLD_SECRET_KEY
//
//  Desplegar:  supabase functions deploy suscribir
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });

const PLANES: Record<string, { amount: number; creditos: number }> = {
  Basic: { amount: 29900, creditos: 10 },
  Standard: { amount: 69900, creditos: 30 },
  Advanced: { amount: 149900, creditos: 100 },
};

async function sha256hex(str: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
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
    const plan: string = body?.plan;
    const p = PLANES[plan];
    if (!p) return json({ error: "plan_invalido" }, 400);

    const apiKey = Deno.env.get("BOLD_API_KEY");
    const secret = Deno.env.get("BOLD_SECRET_KEY");
    if (!apiKey || !secret) return json({ error: "bold_no_configurado" }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: sub, error: subErr } = await admin.from("suscripciones").insert({
      user_id: user.id, plan, amount_cents: p.amount * 100, creditos_ciclo: p.creditos,
      customer_email: user.email, estado: "pendiente",
    }).select("id").single();
    if (subErr) return json({ error: "error_interno", detalle: subErr.message }, 500);

    const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
    const orderId = `SUB-${sub.id}-${yyyymm}`;
    const currency = "COP";

    const { error: cobroErr } = await admin.from("cobros").insert({
      suscripcion_id: sub.id, user_id: user.id, reference: orderId,
      amount_cents: p.amount * 100, creditos: p.creditos, estado: "pendiente",
    });
    if (cobroErr) return json({ error: "error_interno", detalle: cobroErr.message }, 500);

    // ⚠️ Misma fórmula que recarga-firma; confirma con Bold que aplica igual
    // para este flujo antes de producción (ver aviso arriba del archivo).
    const signature = await sha256hex(`${orderId}${p.amount}${currency}${secret}`);
    return json({ orderId, amount: p.amount, currency, apiKey, signature, subscriptionId: sub.id });
  } catch (e) {
    return json({ error: "error_interno", detalle: String(e) }, 500);
  }
});
