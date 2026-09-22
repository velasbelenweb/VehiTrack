import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { marcarOrdenPagada, marcarOrdenFallida } from "@/lib/orders";

// Wompi envía un evento POST cada vez que cambia el estado de una transacción.
// Debes validar la firma del evento (checksum) usando tu EVENTS_SECRET antes de
// confiar en el contenido. Documentación:
// https://docs.wompi.co/docs/colombia/eventos/
//
// Variable de entorno necesaria: WOMPI_EVENTS_SECRET

export async function POST(req: NextRequest) {
  const payload = await req.json();

  try {
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    const { signature, timestamp, data } = payload;

    if (eventsSecret && signature?.checksum) {
      // El checksum se calcula concatenando los valores de las propiedades
      // indicadas en signature.properties (en ese orden), + timestamp + secreto.
      const valores = signature.properties
        .map((path: string) =>
          path
            .split(".")
            .reduce(
              (obj: unknown, key: string) =>
                obj && typeof obj === "object"
                  ? (obj as Record<string, unknown>)[key]
                  : undefined,
              payload
            )
        )
        .join("");
      const cadena = `${valores}${timestamp}${eventsSecret}`;
      const checksumCalculado = crypto
        .createHash("sha256")
        .update(cadena)
        .digest("hex")
        .toUpperCase();

      if (checksumCalculado !== signature.checksum.toUpperCase()) {
        console.warn("Firma de evento Wompi inválida, se ignora el evento.");
        return NextResponse.json({ ok: false }, { status: 400 });
      }
    }

    const transaccion = data?.transaction;
    const referencia = transaccion?.reference;

    if (referencia) {
      if (transaccion.status === "APPROVED") {
        await marcarOrdenPagada(referencia);
        console.log("Pago Wompi aprobado, orden actualizada:", referencia);
      } else if (["DECLINED", "ERROR", "VOIDED"].includes(transaccion.status)) {
        await marcarOrdenFallida(referencia);
        console.log("Pago Wompi rechazado, orden actualizada:", referencia);
      } else {
        console.log("Evento Wompi con estado:", transaccion.status, referencia);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error procesando webhook de Wompi:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
