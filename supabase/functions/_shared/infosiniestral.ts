// ================================================================
//  VEHITRACK · módulo compartido: llamadas a InfoSiniestral
//  Usado por la Edge Function "consulta".
//
//  ✅ CONFIRMADO con una respuesta real de InfoSiniestral (placa HEW146):
//    POST https://infosiniestral.click/api/v1/consultas
//    Headers: Authorization: Bearer <llave> · Content-Type: application/json
//    Body: { placa }
//    → {
//        id, placa, consultado_at,
//        vehiculo: { marca, modelo, clase, tipo, valor },
//        aseguradoras: [{ compania, placa, ini_vigencia, fin_vigencia,
//                          estado, detalle: {...datos de la póliza...} }],
//        siniestros: [],              // vacío en el ejemplo real que tuvimos
//        polizas_sisa: [ ...mismo shape que aseguradoras... ],
//        polizas_soat: [{ compania, placa, ini_vigencia, fin_vigencia,
//                          estado, detalle: { poliza, ... } }],
//        guia_valores: { guia, codigo, marca, modelo, clase, valor_guia,
//                         tipo, detalle_adicional },
//        price_charged, balance, month_count, month_key, via
//      }
//
//  ⚠️ El único ejemplo real que tuvimos trae "siniestros": [] (vacío) —
//  no sabemos con certeza los nombres de campo de un siniestro individual
//  cuando sí hay datos. El frontend debe tratar cada entrada de forma
//  defensiva (mostrar lo que venga, sin asumir campos fijos).
//
//  Reglas del proveedor: máx. 1 consulta a la vez por API key (2 en
//  paralelo entre todas tus apps). Ante 429 (cupo ocupado), reintentar
//  en ~3s — ya implementado aquí.
//
//  Variable de entorno requerida (Supabase → Edge Functions → Secrets):
//    INFOSINIESTRAL_API_KEY   (la llave que empieza con isk_...)
// ================================================================
const INFOSINIESTRAL_URL = "https://infosiniestral.click/api/v1/consultas";

export async function armarInforme(placa: string) {
  const apiKey = Deno.env.get("INFOSINIESTRAL_API_KEY");
  if (!apiKey) throw new Error("InfoSiniestral no está configurado (falta INFOSINIESTRAL_API_KEY)");

  for (let intento = 0; intento < 3; intento++) {
    const r = await fetch(INFOSINIESTRAL_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ placa }),
    });

    if (r.status === 429) { // cupo ocupado — reintenta según indica el proveedor
      await new Promise((res) => setTimeout(res, 3000));
      continue;
    }
    if (r.status === 404) throw new Error("placa_no_encontrada");
    if (r.status === 402) throw new Error("infosiniestral_sin_saldo");
    if (r.status === 401) throw new Error("infosiniestral_api_key_invalida");
    if (r.status === 403) throw new Error("infosiniestral_cuenta_inactiva");
    if (!r.ok) throw new Error(`InfoSiniestral respondió ${r.status}`);
    return await r.json();
  }
  throw new Error("infosiniestral_ocupado"); // 429 persistente tras los reintentos
}
