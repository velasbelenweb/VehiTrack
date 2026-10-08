// ================================================================
//  VEHITRACK · registro de eventos para el panel de superadmin
//  Guarda en la tabla `eventos` lo que sirve para detectar problemas.
//  NUNCA debe guardar llaves, contraseñas ni datos personales de
//  terceros: solo códigos de error, referencias y montos.
//  Si guardar el evento falla, no rompe el flujo principal.
// ================================================================
export type Nivel = "info" | "warn" | "error";

export async function registrarEvento(
  admin: any,
  nivel: Nivel,
  tipo: string,
  userId: string | null,
  detalle: Record<string, unknown> = {},
) {
  try {
    const texto = JSON.stringify(detalle);
    const seguro = texto.length > 2000 ? { truncado: texto.slice(0, 2000) } : detalle;
    const { error } = await admin.from("eventos").insert({ nivel, tipo, user_id: userId, detalle: seguro });
    if (error) console.error("No se pudo registrar evento:", error.message);
  } catch (e) {
    console.error("No se pudo registrar evento:", e);
  }
}
