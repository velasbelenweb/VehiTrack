// ================================================================
//  VEHITRACK · módulo compartido: llamadas a PlacApi
//  Usado por las Edge Functions "consulta" y "wompi-webhook".
// ================================================================
const CONSULTA_FULL_URL = "https://placapi.com/api/consulta-full";
const PERDIDA_TOTAL_URL = "https://placapi.com/api/perdida-total";

export async function consultarPlacApi(
  placa: string, docType?: string, docNumber?: string, primerApellido?: string, ciudad?: string,
) {
  const apiKey = Deno.env.get("PLACAPI_API_KEY");
  if (!apiKey) throw new Error("PlacApi no está configurado (falta PLACAPI_API_KEY)");

  const r = await fetch(CONSULTA_FULL_URL, {
    method: "POST",
    headers: { "x-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ placa, docType, docNumber, primerApellido, ciudad }),
  });
  if (!r.ok) throw new Error(`PlacApi (consulta-full) respondió ${r.status}`);
  return await r.json();
}

export async function consultarPerdidaTotal(placa: string) {
  const apiKey = Deno.env.get("PLACAPI_API_KEY");
  if (!apiKey) throw new Error("PlacApi no está configurado (falta PLACAPI_API_KEY)");

  const r = await fetch(PERDIDA_TOTAL_URL, {
    method: "POST",
    headers: { "x-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ placa }),
  });
  if (!r.ok) throw new Error(`PlacApi (perdida-total) respondió ${r.status}`);
  return await r.json();
}

export async function armarInforme(
  tipo: string, placa: string, docType?: string, docNumber?: string, primerApellido?: string, ciudad?: string,
) {
  const informe = await consultarPlacApi(placa, docType, docNumber, primerApellido, ciudad);
  if (tipo === "avanzado") {
    informe.siniestros = await consultarPerdidaTotal(placa);
  }
  return informe;
}
