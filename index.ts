// ================================================================
//  VEHITRACK · Edge Function "consulta"
//  ----------------------------------------------------------------
//  Descuenta el costo del informe ($5.000 Básico / $10.000 Avanzado)
//  directo del saldo (wallet) del usuario y llama a PlacApi al
//  instante — sin pasar por el checkout de Wompi en cada consulta.
//  Para tener saldo, el usuario recarga su wallet con `recarga-firma`
//  (que sí usa Wompi, una sola vez por recarga).
//
//  Flujo:
//   1) Verifica sesión (JWT del header).
//   2) Descuenta el costo del wallet de forma atómica
//      (consumir_credito). Si no hay saldo, responde error.
//   3) Llama a PlacApi (consulta-full, y perdida-total si es Avanzado).
//   4) Si PlacApi falla, reintegra el saldo (reintegrar_credito).
//   5) Guarda el informe en `consultas` y responde { informe, saldo }.
//
//  Variables de entorno requeridas (Supabase → Edge Functions → Secrets):
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (las inyecta Supabase)
//    PLACAPI_API_KEY
//
//  Desplegar:  supabase functions deploy consulta
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { armarInforme } from "../_shared/placapi.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...CORS } });

const PRECIOS: Record<string, number> = { basico: 5000, avanzado: 10000 }; // pesos, directo del wallet

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
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const placa: string = (body?.placa ?? "").toString().trim().toUpperCase();
    const docType: string | undefined = body?.docType;
    const docNumber: string | undefined = body?.docNumber;
    const primerApellido: string | undefined = body?.primerApellido;
    const ciudad: string | undefined = body?.ciudad;
    const tipo: string = (body?.tipo === "avanzado") ? "avanzado" : "basico";
    const costo = PRECIOS[tipo];
    if (!placa) return json({ error: "placa_requerida" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Cobro atómico contra el saldo del wallet (en pesos)
    const { data: restante, error: rpcErr } = await admin.rpc("consumir_credito", {
      p_user: userId, p_costo: costo,
    });
    if (rpcErr) return json({ error: "error_interno", detalle: rpcErr.message }, 500);
    if (restante === -1) return json({ error: "saldo_insuficiente" }, 402);

    let informe;
    try {
      informe = await armarInforme(tipo, placa, docType, docNumber, primerApellido, ciudad);
    } catch (e) {
      await admin.rpc("reintegrar_credito", { p_user: userId, p_costo: costo });
      return json({ error: "proveedor_no_disponible", detalle: String(e) }, 502);
    }

    await admin.from("consultas").insert({
      user_id: userId, placa, doc_type: docType, doc_number: docNumber,
      payload: informe, source: "placapi", costo,
    });

    return json({ informe, saldo: restante });
  } catch (e) {
    return json({ error: "error_interno", detalle: String(e) }, 500);
  }
});
