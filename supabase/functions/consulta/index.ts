// ================================================================
//  VEHITRACK · Edge Function "consulta"
//  ----------------------------------------------------------------
//  Descuenta $20.000 del saldo (wallet) del usuario y llama EN
//  PARALELO a InfoSiniestral (aseguradoras/SOAT/siniestros/avalúo) y
//  a PlacApi (RUNT/situación legal/SIMIT/tecnomecánica/impuestos/
//  Fasecolda/pico y placa/licencia). El resultado se combina en un
//  solo informe { infosiniestral, placapi }.
//
//  Flujo:
//   1) Verifica sesión (JWT del header).
//   2) Descuenta el costo del wallet de forma atómica
//      (consumir_credito). Si no hay saldo, responde error.
//   3) Llama a las dos fuentes en paralelo (Promise.allSettled): si
//      UNA falla, el informe sale con esa sección vacía y la otra
//      completa. Si LAS DOS fallan, se reintegra el saldo y se
//      responde error (no se cobra una consulta vacía).
//   4) Guarda el informe combinado en `consultas` (queda en el
//      historial de la cuenta del usuario).
//   5) Envía una copia por correo al usuario con Resend (si falla el
//      envío de correo, no se revierte el cobro — la consulta ya se
//      prestó y quedó guardada en la cuenta).
//   6) Responde { informe, saldo }.
//
//  Variables de entorno requeridas (Supabase → Edge Functions → Secrets):
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (las inyecta Supabase)
//    INFOSINIESTRAL_API_KEY
//    PLACAPI_API_KEY
//    RESEND_API_KEY
//    RESEND_FROM   (ej. "VehiTrack <informes@vehitrack.app>" — el
//                   dominio debe estar verificado en Resend)
//
//  Desplegar:  supabase functions deploy consulta --no-verify-jwt
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { armarInforme as armarInformeInfoSiniestral } from "../_shared/infosiniestral.ts";
import { armarInformePlacApi } from "../_shared/placapi.ts";
import { construirEmailInforme } from "../_shared/email-informe.ts";
import { registrarEvento } from "../_shared/eventos.ts";
import { guardarSaldo, avisarSiBajo } from "../_shared/saldos.ts";

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


const COSTO = 20000; // pesos, directo del wallet — un solo informe combinado

async function enviarCorreo(destino: string, placa: string, informe: any): Promise<string | null> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM") || "VehiTrack <informes@vehitrack.app>";
  if (!apiKey) { console.error("RESEND_API_KEY no configurado: no se envía copia por correo."); return "resend_sin_configurar"; }
  try {
    const html = construirEmailInforme(informe, placa);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [destino], subject: `Tu informe VehiTrack — placa ${placa}`, html }),
    });
    if (!r.ok) { console.error("Resend respondió", r.status, await r.text()); return `resend_${r.status}`; }
    return null;
  } catch (e) {
    console.error("Error enviando correo:", e);
    return "resend_excepcion";
  }
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
    const userEmail = userData.user.email;

    const body = await req.json().catch(() => ({}));
    const placa: string = (body?.placa ?? "").toString().trim().toUpperCase();
    const docType: string | undefined = body?.docType;
    const docNumber: string | undefined = body?.docNumber;
    const primerApellido: string | undefined = body?.primerApellido;
    const ciudad: string | undefined = body?.ciudad;
    if (!/^[A-Z0-9]{5,7}$/.test(placa)) return json({ error: "placa_invalida" }, 400);
    if (!docNumber || !/^[A-Za-z0-9]{5,15}$/.test(docNumber)) return json({ error: "documento_invalido" }, 400);
    if (docType && !["CC", "CE", "NIT", "PA", "TI", "PPT"].includes(docType)) return json({ error: "tipo_documento_invalido" }, 400);
    if ((primerApellido ?? "").length > 40 || (ciudad ?? "").length > 60) return json({ error: "datos_invalidos" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Límite de ritmo: máx. 5 consultas por minuto por usuario (frena abuso y dobles clics).
    const hace1min = new Date(Date.now() - 60_000).toISOString();
    const { count: recientes } = await admin.from("consultas").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", hace1min);
    if ((recientes ?? 0) >= 5) {
      await registrarEvento(admin, "warn", "limite_consultas", userId, { en_el_ultimo_minuto: recientes });
      return json({ error: "demasiadas_consultas" }, 429);
    }

    // Cobro atómico contra el saldo del wallet (en pesos)
    const { data: restante, error: rpcErr } = await admin.rpc("consumir_credito", {
      p_user: userId, p_costo: COSTO,
    });
    if (rpcErr) { console.error("consumir_credito:", rpcErr.message); return json({ error: "error_interno" }, 500); }
    if (restante === -1) return json({ error: "saldo_insuficiente" }, 402);

    // Llamadas en paralelo a las dos fuentes
    const [resInfo, resPlac] = await Promise.allSettled([
      armarInformeInfoSiniestral(placa),
      armarInformePlacApi(placa, docType, docNumber, primerApellido, ciudad),
    ]);

    let infosiniestral: any = null, infosiniestralError: string | null = null;
    if (resInfo.status === "fulfilled") {
      infosiniestral = resInfo.value;
    } else {
      const msg = String((resInfo.reason as Error)?.message ?? resInfo.reason);
      if (msg === "placa_no_encontrada") infosiniestral = { sinResultados: true };
      else infosiniestralError = msg;
    }

    let placapi: any = null, placapiError: string | null = null;
    if (resPlac.status === "fulfilled") {
      placapi = resPlac.value;
    } else {
      placapiError = String((resPlac.reason as Error)?.message ?? resPlac.reason);
    }

    // Saldos de los proveedores (alimentan la pestaña "Saldos" del superadmin)
    if (infosiniestral && !infosiniestral.sinResultados && Number.isFinite(Number(infosiniestral.balance))) {
      await guardarSaldo(admin, "infosiniestral", {
        saldo: Number(infosiniestral.balance), costo_consulta: Number(infosiniestral.price_charged), origen: "api",
      });
    }
    // El saldo/costo de VehiTrack con el proveedor es información interna: no viaja al cliente ni al historial.
    if (infosiniestral && typeof infosiniestral === "object") {
      for (const k of ["balance", "price_charged", "month_count", "month_key"]) delete infosiniestral[k];
    }
    if (infosiniestralError === "infosiniestral_sin_saldo") await registrarEvento(admin, "error", "proveedor_sin_saldo", userId, { proveedor: "infosiniestral" });
    if (placapiError?.startsWith("placapi_sin_creditos")) {
      const s = Number(placapiError.split(":")[1]);
      if (Number.isFinite(s)) await guardarSaldo(admin, "placapi", { saldo: s, origen: "api" });
      await registrarEvento(admin, "error", "proveedor_sin_saldo", userId, { proveedor: "placapi", saldo: Number.isFinite(s) ? s : null });
      placapiError = "placapi_sin_creditos"; // sin el número, para que no llegue al cliente
    } else if (placapi) {
      await avisarSiBajo(admin, "placapi"); // el saldo de PlacApi es estimado: se revisa tras cada consulta
    }

    // Si LAS DOS fallaron de verdad (sin ni siquiera "sin resultados"), se reintegra.
    if (!infosiniestral && !placapi) {
      await admin.rpc("reintegrar_credito", { p_user: userId, p_costo: COSTO });
      console.error("Proveedores caídos:", infosiniestralError, placapiError);
      await registrarEvento(admin, "error", "proveedores_caidos_reintegrado", userId, { placa, infosiniestral: infosiniestralError, placapi: placapiError, reintegrado: COSTO });
      return json({ error: "proveedor_no_disponible" }, 502);
    }

    if (infosiniestralError || placapiError) {
      await registrarEvento(admin, "warn", "informe_incompleto", userId, { placa, infosiniestral: infosiniestralError, placapi: placapiError });
    }
    const informe = { placa, infosiniestral, infosiniestralError, placapi, placapiError };

    const { error: insErr } = await admin.from("consultas").insert({
      user_id: userId, placa, doc_type: docType, doc_number: docNumber,
      payload: informe, source: "infosiniestral+placapi", costo: COSTO,
    });
    if (insErr) {
      console.error("ALERTA: no se pudo guardar la consulta en el historial:", insErr.message);
      await registrarEvento(admin, "error", "historial_no_guardado", userId, { placa, motivo: insErr.message });
    }

    // Copia por correo — se espera a que termine (para no perderla si la
    // función se apaga apenas responde), pero si falla no revierte el cobro:
    // la consulta ya se prestó y quedó guardada en el historial de la cuenta.
    if (userEmail) {
      const errCorreo = await enviarCorreo(userEmail, placa, informe);
      if (errCorreo) await registrarEvento(admin, "warn", "correo_no_enviado", userId, { placa, motivo: errCorreo });
    }

    return json({ informe, saldo: restante });
  } catch (e) {
    console.error(e);
    return json({ error: "error_interno" }, 500);
  }
});
