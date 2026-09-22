import crypto from "crypto";

// Documentación de referencia: https://docs.wompi.co/docs/colombia/widget-checkout-web/
//
// Variables de entorno necesarias (ver .env.example):
// WOMPI_PUBLIC_KEY        -> llave pública (pub_test_... o pub_prod_...)
// WOMPI_INTEGRITY_SECRET  -> secreto de integridad (solo backend, NUNCA exponerlo al cliente)
// NEXT_PUBLIC_SITE_URL    -> URL pública del sitio, para construir redirect-url

export type WompiCheckoutInput = {
  referencia: string; // identificador único de la orden
  montoEnPesos: number; // valor total en COP (sin decimales)
  nombreComprador?: string;
  emailComprador?: string;
  telefonoComprador?: string;
};

/**
 * Genera la firma de integridad SHA256 exigida por Wompi:
 * sha256(referencia + montoEnCentavos + moneda + secretoIntegridad)
 */
export function generarFirmaIntegridadWompi({
  referencia,
  montoEnCentavos,
  moneda = "COP",
}: {
  referencia: string;
  montoEnCentavos: number;
  moneda?: string;
}) {
  const secreto = process.env.WOMPI_INTEGRITY_SECRET;
  if (!secreto) {
    throw new Error(
      "Falta configurar WOMPI_INTEGRITY_SECRET en las variables de entorno."
    );
  }
  const cadena = `${referencia}${montoEnCentavos}${moneda}${secreto}`;
  return crypto.createHash("sha256").update(cadena).digest("hex");
}

/**
 * Construye la URL del Web Checkout de Wompi (redirección hospedada por Wompi).
 * El comprador paga en checkout.wompi.co y luego vuelve a redirectUrl.
 */
export function construirUrlCheckoutWompi(input: WompiCheckoutInput) {
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!publicKey) {
    throw new Error("Falta configurar WOMPI_PUBLIC_KEY en las variables de entorno.");
  }

  const montoEnCentavos = Math.round(input.montoEnPesos * 100);
  const firma = generarFirmaIntegridadWompi({
    referencia: input.referencia,
    montoEnCentavos,
  });

  const params = new URLSearchParams({
    "public-key": publicKey,
    currency: "COP",
    "amount-in-cents": String(montoEnCentavos),
    reference: input.referencia,
    "signature:integrity": firma,
    "redirect-url": `${siteUrl}/gracias?ref=${encodeURIComponent(input.referencia)}&metodo=wompi`,
  });

  if (input.emailComprador) params.set("customer-data:email", input.emailComprador);
  if (input.nombreComprador)
    params.set("customer-data:full-name", input.nombreComprador);
  if (input.telefonoComprador)
    params.set("customer-data:phone-number", input.telefonoComprador);

  return `https://checkout.wompi.co/p/?${params.toString()}`;
}
