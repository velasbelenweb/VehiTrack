import { MercadoPagoConfig, Preference } from "mercadopago";

// Documentación de referencia: https://www.mercadopago.com.co/developers/es/docs/checkout-pro/landing
//
// Variable de entorno necesaria (ver .env.example):
// MERCADOPAGO_ACCESS_TOKEN -> access token privado de la cuenta de Mercado Pago (TEST- o APP_USR-)
// NEXT_PUBLIC_SITE_URL     -> URL pública del sitio, para construir back_urls

export type MercadoPagoItemInput = {
  titulo: string;
  cantidad: number;
  precioUnitario: number; // COP
};

export async function crearPreferenciaMercadoPago({
  referencia,
  items,
  emailComprador,
}: {
  referencia: string;
  items: MercadoPagoItemInput[];
  emailComprador?: string;
}) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "Falta configurar MERCADOPAGO_ACCESS_TOKEN en las variables de entorno."
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  const response = await preference.create({
    body: {
      external_reference: referencia,
      items: items.map((item, idx) => ({
        id: String(idx),
        title: item.titulo,
        quantity: item.cantidad,
        unit_price: item.precioUnitario,
        currency_id: "COP",
      })),
      payer: emailComprador ? { email: emailComprador } : undefined,
      back_urls: {
        success: `${siteUrl}/gracias?ref=${encodeURIComponent(referencia)}&metodo=mercadopago`,
        pending: `${siteUrl}/gracias?ref=${encodeURIComponent(referencia)}&metodo=mercadopago&estado=pendiente`,
        failure: `${siteUrl}/checkout?error=mercadopago`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/checkout/mercadopago/webhook`,
    },
  });

  return response; // response.init_point = URL de pago a la que se redirige al comprador
}
