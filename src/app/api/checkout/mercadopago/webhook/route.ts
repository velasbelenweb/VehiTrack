import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { marcarOrdenPagada, marcarOrdenFallida } from "@/lib/orders";

// Mercado Pago llama a notification_url cuando cambia el estado de un pago.
// Aquí solo llega un id de pago; hay que consultar la API para confirmar el
// estado real antes de dar el pedido como pagado.
// Documentación: https://www.mercadopago.com.co/developers/es/docs/checkout-pro/additional-content/notifications/webhooks

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const paymentId =
      body?.data?.id ?? new URL(req.url).searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json({ ok: true }); // notificación irrelevante, se ignora
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn("MERCADOPAGO_ACCESS_TOKEN no configurado, no se puede verificar el pago.");
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = await new Payment(client).get({ id: paymentId });
    const referencia = payment.external_reference;

    if (referencia) {
      if (payment.status === "approved") {
        await marcarOrdenPagada(referencia);
        console.log("Pago Mercado Pago aprobado, orden actualizada:", referencia);
      } else if (["rejected", "cancelled"].includes(payment.status ?? "")) {
        await marcarOrdenFallida(referencia);
        console.log("Pago Mercado Pago rechazado, orden actualizada:", referencia);
      } else {
        console.log("Notificación Mercado Pago con estado:", payment.status, referencia);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
