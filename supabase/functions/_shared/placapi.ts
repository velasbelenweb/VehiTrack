// ================================================================
//  VEHITRACK · módulo compartido: llamadas a PlacApi
//  Usado por la Edge Function "consulta", en conjunto con
//  InfoSiniestral (ver _shared/infosiniestral.ts), para armar un
//  solo informe combinado.
//
//  ✅ CONFIRMADO contra ejemplos reales de la documentación de PlacApi:
//    POST https://placapi.com/api/consulta-full
//    Headers: x-api-key: TU_LLAVE · content-type: application/json
//    Body: { placa, docType, docNumber, primerApellido, ciudad }
//    → RUNT, SOAT, RTM, antecedentes (prendas/embargos), SIMIT,
//      impuestos, Fasecolda, pico y placa, licencia.
//
//  Ya NO se llama a /api/perdida-total (esos siniestros ahora vienen
//  de InfoSiniestral, que los trae sin costo adicional dentro de su
//  única consulta) — así evitamos pagarle dos veces por lo mismo.
//
//  Variable de entorno requerida (Supabase → Edge Functions → Secrets):
//    PLACAPI_API_KEY   (pk_live_... / pk_test_...)
// ================================================================
const CONSULTA_FULL_URL = "https://placapi.com/api/consulta-full";

export async function armarInformePlacApi(
  placa: string,
  docType?: string,
  docNumber?: string,
  primerApellido?: string,
  ciudad?: string,
) {
  const apiKey = Deno.env.get("PLACAPI_API_KEY");
  if (!apiKey) throw new Error("PlacApi no está configurado (falta PLACAPI_API_KEY)");

  const r = await fetch(CONSULTA_FULL_URL, {
    method: "POST",
    headers: { "x-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ placa, docType, docNumber, primerApellido, ciudad }),
  });
  if (r.status === 402) {
    // Según su documentación, el 402 "no_credits" trae el campo `saldo` en el cuerpo.
    const b = await r.json().catch(() => ({}));
    const s = Number(b?.saldo);
    throw new Error(Number.isFinite(s) ? `placapi_sin_creditos:${s}` : "placapi_sin_creditos");
  }
  if (!r.ok) throw new Error(`PlacApi (consulta-full) respondió ${r.status}`);
  return await r.json();
}
