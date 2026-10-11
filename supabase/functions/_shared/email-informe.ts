// ================================================================
//  VEHITRACK · plantilla de correo del informe (HTML simple)
//  ----------------------------------------------------------------
//  Genera el HTML que se envía por correo con Resend. Es una versión
//  más simple que la página web (sin JS, sin semáforo interactivo),
//  pero con la misma información, para que sirva como copia/respaldo
//  del informe.
// ================================================================
function esVigente(estado?: string) {
  return (estado || "").toUpperCase().startsWith("VIGENTE");
}
function money(n?: number) {
  if (n == null) return "—";
  return "$ " + Number(n).toLocaleString("es-CO");
}
function fila(k: string, v: string | number | null | undefined) {
  return `<tr><td style="padding:6px 10px;color:#5A6577;font-size:13px;white-space:nowrap">${k}</td><td style="padding:6px 10px;font-size:13px;font-weight:600">${v ?? "—"}</td></tr>`;
}
function tarjeta(titulo: string, contenidoHtml: string) {
  return `
  <div style="border:1px solid #E3E7EC;border-radius:12px;padding:16px;margin-bottom:14px;background:#fff">
    <h3 style="margin:0 0 10px;font-size:15px;color:#1C2C3E;font-family:Arial,sans-serif">${titulo}</h3>
    ${contenidoHtml}
  </div>`;
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
// Escapa recursivamente todo texto de proveedores externos antes de meterlo en el HTML del correo.
function sanear(x: any): any {
  if (typeof x === "string") return esc(x);
  if (Array.isArray(x)) return x.map(sanear);
  if (x && typeof x === "object") { const o: any = {}; for (const k in x) o[esc(k)] = sanear(x[k]); return o; }
  return x;
}

export function construirEmailInforme(informeCrudo: any, placaCruda: string): string {
  const informe = sanear(informeCrudo);
  const placa = esc(placaCruda);
  const info = informe?.infosiniestral;
  const pla = informe?.placapi;

  let secciones = "";

  // --- InfoSiniestral: vehículo, aseguradoras, SOAT, siniestros, avalúo ---
  if (info && !info.sinResultados) {
    const v = info.vehiculo || {};
    secciones += tarjeta(
      "Vehículo",
      `<table>${fila("Marca", v.marca)}${fila("Modelo", v.modelo)}${fila("Clase", v.clase)}${fila("Tipo", v.tipo)}</table>`,
    );
    const aseg = info.aseguradoras || [];
    secciones += tarjeta(
      "Historial de aseguradoras",
      aseg.length
        ? `<table>${aseg.map((a: any) => fila(a.compania, `${a.ini_vigencia} → ${a.fin_vigencia} · ${esVigente(a.estado) ? "Vigente" : a.estado}`)).join("")}</table>`
        : `<p style="font-size:13px;color:#5A6577">Sin historial de aseguradoras.</p>`,
    );
    const soatArr = info.polizas_soat || [];
    secciones += tarjeta(
      "Historial de SOAT",
      soatArr.length
        ? `<table>${soatArr.map((a: any) => fila(a.compania, `${a.ini_vigencia} → ${a.fin_vigencia} · ${esVigente(a.estado) ? "Vigente" : a.estado}`)).join("")}</table>`
        : `<p style="font-size:13px;color:#5A6577">Sin historial de SOAT.</p>`,
    );
    const siniestros = info.siniestros || [];
    secciones += tarjeta(
      "Siniestros",
      siniestros.length
        ? `<p style="font-size:13px;color:#B3261E;font-weight:700">${siniestros.length} siniestro(s) registrado(s). Revisa el detalle completo en el sitio.</p>`
        : `<p style="font-size:13px;color:#5A6577">Sin siniestros registrados.</p>`,
    );
    if (info.guia_valores) {
      secciones += tarjeta("Avalúo comercial", `<table>${fila("Valor guía", info.guia_valores.valor_guia)}${fila("Código", info.guia_valores.codigo)}</table>`);
    }
  } else if (info?.sinResultados) {
    secciones += tarjeta("Aseguradoras, SOAT, siniestros y avalúo", `<p style="font-size:13px;color:#5A6577">Esta placa no tiene registros de aseguradoras, SOAT, siniestros ni avalúo.</p>`);
  } else if (informe?.infosiniestralError) {
    secciones += tarjeta("Aseguradoras, SOAT, siniestros y avalúo", `<p style="font-size:13px;color:#5A6577">No disponible en esta consulta.</p>`);
  }

  // --- PlacApi: RUNT, situación legal, multas, tecnomecánica, impuestos, pico y placa, licencia ---
  if (pla) {
    const v = pla.vehicle?.data, a = pla.antecedentes?.data, s = pla.simit?.data, soat = pla.soat?.data, rtm = pla.rtm?.data, imp = pla.impuestos?.data, fc = pla.fasecolda?.data;
    if (v) secciones += tarjeta("Identificación (RUNT)", `<table>${fila("Marca", v.marca)}${fila("Línea", v.linea)}${fila("Modelo", v.modelo)}${fila("Estado", v.estado)}${fila("Color", v.color)}</table>`);
    if (a) secciones += tarjeta("Situación legal", `<table>${fila("Prendas", (a.prendas || []).length)}${fila("Embargos", (a.embargos || []).length)}${fila("Propietarios", a.historicoPropietarios)}</table>`);
    if (soat) secciones += tarjeta("SOAT (vigencia)", `<table>${fila("Vigente", soat.vigente ? "Sí" : "No")}${fila("Aseguradora", soat.aseguradora)}${fila("Vence", soat.fechaVencimiento)}</table>`);
    if (rtm) secciones += tarjeta("Tecnomecánica", `<table>${fila("Vigente", rtm.vigente ? "Sí" : "No")}${fila("CDA", rtm.cda)}${fila("Vence", rtm.fechaVencimiento)}</table>`);
    if (s) secciones += tarjeta("Multas (SIMIT)", `<table>${fila("Deuda total", money(s.totalDeuda))}${fila("Paz y salvo", s.pazSalvo ? "Sí" : "No")}</table>`);
    if (imp) secciones += tarjeta("Impuestos", `<table>${fila("Total pendiente", money(imp.totalPendiente))}${fila("Departamento", imp.departamento)}</table>`);
    if (fc) secciones += tarjeta("Avalúo Fasecolda", `<table>${fila("Valor comercial", money(fc.valorComercial))}${fila("Código", fc.codigo)}</table>`);
  } else if (informe?.placapiError) {
    secciones += tarjeta("RUNT / SOAT / tecnomecánica / SIMIT / impuestos / Fasecolda", `<p style="font-size:13px;color:#5A6577">No disponible en esta consulta.</p>`);
  }

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#16222F">
    <div style="padding:20px 0;text-align:center;border-bottom:3px solid #0A9D7B;margin-bottom:20px">
      <h1 style="margin:0;font-size:20px;color:#1C2C3E">VehiTrack</h1>
      <p style="margin:4px 0 0;color:#5A6577;font-size:13px">Informe vehicular — placa ${placa}</p>
    </div>
    ${secciones}
    <p style="font-size:12px;color:#5A6577;margin-top:20px">Este correo es una copia de respaldo de tu consulta. Puedes ver el informe completo, con el semáforo de riesgo, iniciando sesión en <a href="https://vehitrack.app" style="color:#0A9D7B">vehitrack.app</a> y revisando tu historial.</p>
  </div>`;
}
