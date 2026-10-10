// ================================================================
//  VEHITRACK · saldos de los proveedores (InfoSiniestral y PlacApi)
//
//  Ninguno de los dos publica un servicio para consultar el saldo, así que:
//   • InfoSiniestral: cada respuesta de consulta trae `balance` y
//     `price_charged` (visto en una respuesta real) → se guarda solo.
//   • PlacApi: solo informa su `saldo` en el error 402 (sin créditos) y la
//     consulta-full cuesta 3 créditos (según su documentación). El saldo
//     actual lo escribe el superadmin a mano (panel → Saldos) y desde ahí
//     se descuenta lo gastado en consultas hechas por VehiTrack.
// ================================================================
import { registrarEvento } from "./eventos.ts";

export const UMBRAL_CONSULTAS = 15;
export type Proveedor = "infosiniestral" | "placapi";

export async function estadoProveedor(db: any, proveedor: Proveedor) {
  const { data: row } = await db.from("proveedor_saldos").select("*").eq("proveedor", proveedor).maybeSingle();
  if (!row) return { proveedor, configurado: false };
  const costo = Number(row.costo_consulta) || 1;
  let usadas = 0;
  // Con InfoSiniestral y saldo leído de su API, el valor ya es el real: no se resta nada.
  if (!(proveedor === "infosiniestral" && row.origen === "api")) {
    const { count } = await db.from("consultas").select("id", { count: "exact", head: true })
      .gte("created_at", row.actualizado_at).not(`payload->>${proveedor}`, "is", null);
    usadas = count ?? 0;
  }
  const saldoEstimado = Number(row.saldo) - usadas * costo;
  const restantes = Math.max(0, Math.floor(saldoEstimado / costo));
  return {
    proveedor, configurado: true,
    saldo_base: Number(row.saldo), costo_consulta: costo, origen: row.origen, actualizado_at: row.actualizado_at,
    consultas_desde: usadas, saldo_estimado: saldoEstimado, restantes,
    bajo: restantes < UMBRAL_CONSULTAS,
  };
}

/** Guarda el saldo y, si quedan menos de 15 consultas, deja un aviso (máx. 1 por día y proveedor). Nunca lanza error. */
export async function guardarSaldo(
  db: any, proveedor: Proveedor,
  datos: { saldo: number; costo_consulta?: number; origen: "api" | "manual" },
) {
  try {
    const fila: Record<string, unknown> = { proveedor, saldo: datos.saldo, origen: datos.origen, actualizado_at: new Date().toISOString() };
    if (datos.costo_consulta && datos.costo_consulta > 0) fila.costo_consulta = datos.costo_consulta;
    const { error } = await db.from("proveedor_saldos").upsert(fila, { onConflict: "proveedor" });
    if (error) { console.error("proveedor_saldos:", error.message); return; }
    await avisarSiBajo(db, proveedor);
  } catch (e) { console.error("guardarSaldo:", e); }
}

export async function avisarSiBajo(db: any, proveedor: Proveedor) {
  try {
    const est: any = await estadoProveedor(db, proveedor);
    if (!est.configurado || !est.bajo) return;
    const hace24h = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await db.from("eventos").select("id", { count: "exact", head: true })
      .eq("tipo", "saldo_proveedor_bajo").eq("detalle->>proveedor", proveedor).gte("created_at", hace24h);
    if ((count ?? 0) > 0) return;
    await registrarEvento(db, "warn", "saldo_proveedor_bajo", null, { proveedor, consultas_restantes: est.restantes, saldo_estimado: est.saldo_estimado });
  } catch (e) { console.error("avisarSiBajo:", e); }
}
