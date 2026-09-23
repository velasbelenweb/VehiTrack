// ================================================================
//  VEHITRACK · Edge Function "consulta"
//  ----------------------------------------------------------------
//  El frontend llama a esta función (sb.functions.invoke('consulta'))
//  en vez de llamar a PlacApi directo, para que la API key de PlacApi
//  nunca quede expuesta en el navegador.
//
//  Flujo:
//   1) Verifica que el usuario esté autenticado (JWT del header).
//   2) Revisa caché reciente en `consultas` para esa placa (opcional,
//      evita cobrar dos veces la misma placa en poco tiempo).
//   3) Cobra 1 crédito de forma atómica con consumir_credito().
//   4) Llama a PlacApi con la API key guardada como secreto.
//   5) Si PlacApi falla, reintegra el crédito con reintegrar_credito().
//   6) Guarda el informe en `consultas` y responde { informe, saldo }.
//
//  ✅ CONFIRMADO contra un ejemplo real de la documentación de PlacApi
//  (botón "Probar" → curl):
//    POST https://placapi.com/api/consulta-full
//    Headers: x-api-key: TU_LLAVE · content-type: application/json
//    Body: { placa, docType, docNumber, primerApellido, ciudad }
//  La respuesta ya trae casi exactamente el shape que usa el frontend
//  (vehicle, soat, rtm, antecedentes, simit, impuestos, fasecolda,
//  picoYPlaca, licencia), así que aquí solo se reenvía tal cual.
//
//  Variables de entorno requeridas (Supabase → Edge Functions → Secrets):
//    SUPABASE_URL               (ya la inyecta Supabase automáticamente)
//    SUPABASE_SERVICE_ROLE_KEY  (ya la inyecta Supabase automáticamente)
//    PLACAPI_API_KEY            tu llave (pk_live_... / pk_test_...)
//
//  Desplegar:  supabase functions deploy consulta
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...CORS } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COSTO_CREDITOS = 1;
const CACHE_MINUTOS = 0; // súbelo (ej. 60) si quieres servir caché reciente sin cobrar de nuevo
const PLACAPI_URL = "https://placapi.com/api/consulta-full";

async function consultarPlacApi(placa: string, docType?: string, docNumber?: string, primerApellido?: string, ciudad?: string) {
  const apiKey = Deno.env.get("PLACAPI_API_KEY");
  if (!apiKey) throw new Error("PlacApi no está configurado (falta PLACAPI_API_KEY)");

  const r = await fetch(PLACAPI_URL, {
    method: "POST",
    headers: { "x-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ placa, docType, docNumber, primerApellido, ciudad }),
  });
  if (!r.ok) throw new Error(`PlacApi respondió ${r.status}`);
  const data = await r.json();
  return data;
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
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const placa: string = (body?.placa ?? "").toString().trim().toUpperCase();
    const docType: string | undefined = body?.docType;
    const docNumber: string | undefined = body?.docNumber;
    const primerApellido: string | undefined = body?.primerApellido;
    const ciudad: string | undefined = body?.ciudad;
    if (!placa) return json({ error: "placa_requerida" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Caché opcional: evita cobrar de nuevo si ya se consultó hace poco.
    if (CACHE_MINUTOS > 0) {
      const desde = new Date(Date.now() - CACHE_MINUTOS * 60_000).toISOString();
      const { data: cache } = await admin.from("consultas")
        .select("payload").eq("placa", placa).gte("created_at", desde)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (cache) {
        const { data: wallet } = await admin.from("wallets").select("creditos").eq("user_id", userId).maybeSingle();
        return json({ informe: cache.payload, saldo: wallet?.creditos ?? 0, source: "cache" });
      }
    }

    // Cobro atómico de crédito
    const { data: restante, error: rpcErr } = await admin.rpc("consumir_credito", {
      p_user: userId, p_costo: COSTO_CREDITOS,
    });
    if (rpcErr) return json({ error: "error_interno", detalle: rpcErr.message }, 500);
    if (restante === -1) return json({ error: "saldo_insuficiente" }, 402);

    // Llamada al proveedor real
    let informe;
    try {
      informe = await consultarPlacApi(placa, docType, docNumber, primerApellido, ciudad);
    } catch (e) {
      await admin.rpc("reintegrar_credito", { p_user: userId, p_costo: COSTO_CREDITOS });
      return json({ error: "proveedor_no_disponible", detalle: String(e) }, 502);
    }

    // Guardar en historial/caché
    await admin.from("consultas").insert({
      user_id: userId, placa, doc_type: docType, doc_number: docNumber,
      payload: informe, source: "placapi", costo: COSTO_CREDITOS,
    });

    return json({ informe, saldo: restante, source: "placapi" });
  } catch (e) {
    return json({ error: "error_interno", detalle: String(e) }, 500);
  }
});
