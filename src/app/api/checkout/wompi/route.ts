import { NextRequest, NextResponse } from "next/server";
import { construirUrlCheckoutWompi } from "@/lib/wompi";
import { crearOrdenPendiente } from "@/lib/orders";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { total, nombre, email, telefono, items } = body as {
      total: number;
      nombre?: string;
      email?: string;
      telefono?: string;
      items: {
        slug: string;
        nombre: string;
        varianteNombre?: string;
        precio: number;
        cantidad: number;
      }[];
    };

    if (!total || total <= 0) {
      return NextResponse.json(
        { error: "El total del pedido no es válido." },
        { status: 400 }
      );
    }
    if (!items?.length) {
      return NextResponse.json(
        { error: "El carrito está vacío." },
        { status: 400 }
      );
    }

    // La referencia se genera aquí y se guarda en la orden ANTES de crear el
    // pago, para que el webhook de Wompi pueda encontrarla luego y marcarla
    // como pagada con certeza.
    const referencia = `BELEN-${Date.now()}-${randomUUID().slice(0, 8)}`;

    await crearOrdenPendiente({
      referencia,
      metodo: "wompi",
      total,
      nombreCliente: nombre,
      emailCliente: email,
      telefonoCliente: telefono,
      items: items.map((i) => ({
        productoSlug: i.slug,
        nombre: i.nombre,
        varianteNombre: i.varianteNombre,
        precio: i.precio,
        cantidad: i.cantidad,
      })),
    });

    const url = construirUrlCheckoutWompi({
      referencia,
      montoEnPesos: total,
      nombreComprador: nombre,
      emailComprador: email,
      telefonoComprador: telefono,
    });

    return NextResponse.json({ url, referencia });
  } catch (err) {
    console.error("Error creando checkout de Wompi:", err);
    return NextResponse.json(
      {
        error:
          "No se pudo generar el pago con Wompi. Verifica las credenciales y la conexión a la base de datos.",
      },
      { status: 500 }
    );
  }
}
