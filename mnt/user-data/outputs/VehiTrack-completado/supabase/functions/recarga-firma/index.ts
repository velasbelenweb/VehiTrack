// ================================================================
//  VEHITRACK · Edge Function "recarga-firma"
//  ----------------------------------------------------------------
//  El frontend llama a esta función antes de mostrar el botón de
//  pagos de Bold. Aquí (y solo aquí) vive la llave SECRETA de Bold,
//  usada para calcular la "firma de integridad" que exige su botón.
//
//  Fórmula de la firma (documentada por Bold para el botón de pagos):
//    sha256hex( `${orderId}${amountInCents... o amount}${currency}${secretKey}` )
//  ⚠️ No verificado con documentación oficial actualizada de Bold —
//  confirma en tu panel de Bold (Integraciones → Botón de pagos) el
//  orden exacto de los campos y si el monto va en pesos o en
//  centavos antes de pasar a producción. Ajusta `armarFirma` si es
//  distinto.
//
//  Variables de entorno requeridas (Supabase → Edge Functions → Secrets):
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (las inyecta Supabase)
//    BOLD_API_KEY      llave de IDENTIDAD (pública) de Bold
//    BOLD_SECRET_KEY   llave SECRETA de Bold — nunca sale de esta función
//
//  Desplegar:  supabase functions deploy recarga-firma
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });

// Créditos que otorga cada monto de recarga (debe reflejar lo que
// muestra el frontend en el modal de recarga).
const TABLA_RECARGAS: Record<number, number> = {
  20000: 4,
  50000: 12,   // 10 + 2 de bono
  100000: 25,  // 20 + 5 de bono
};

async function sha256hex(str: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function armarFirma(orderId: string, amount: number, currency: string) {
  const secret = Deno.env.get("BOLD_SECRET_KEY");
  if (!secret) throw new Error("BOLD_SECRET_KEY no configurada");
  return sha256hex(`${orderId}${amount}${currency}${secret}`);
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
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const monto = Number(body?.monto);
    const creditos = TABLA_RECARGAS[monto];
    if (!monto || !creditos) return json({ error: "monto_invalido" }, 400);

    const apiKey = Deno.env.get("BOLD_API_KEY");
    if (!apiKey) return json({ error: "bold_no_configurado" }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const orderId = `AFV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const currency = "COP";

    const { error: insErr } = await admin.from("recargas").insert({
      user_id: userId, reference: orderId, monto_cents: monto * 100, creditos, estado: "pendiente",
    });
    if (insErr) return json({ error: "error_interno", detalle: insErr.message }, 500);

    const signature = await armarFirma(orderId, monto, currency);
    return json({ orderId, amount: monto, currency, apiKey, signature });
  } catch (e) {
    return json({ error: "error_interno", detalle: String(e) }, 500);
  }
});
