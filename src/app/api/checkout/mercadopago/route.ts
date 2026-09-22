import { NextRequest, NextResponse } from "next/server";
import { crearPreferenciaMercadoPago } from "@/lib/mercadopago";
import { crearOrdenPendiente } from "@/lib/orders";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, email, nombre, telefono } = body as {
      items: {
        slug: string;
        titulo: string;
        varianteNombre?: string;
        cantidad: number;
        precioUnitario: number;
      }[];
      email?: string;
      nombre?: string;
      telefono?: string;
    };

    if (!items?.length) {
      return NextResponse.json(
        { error: "El carrito está vacío." },
        { status: 400 }
      );
    }

    const total = items.reduce(
      (acc, i) => acc + i.precioUnitario * i.cantidad,
      0
    );
    const referencia = `BELEN-${Date.now()}-${randomUUID().slice(0, 8)}`;

    await crearOrdenPendiente({
      referencia,
      metodo: "mercadopago",
      total,
      nombreCliente: nombre,
      emailCliente: email,
      telefonoCliente: telefono,
      items: items.map((i) => ({
        productoSlug: i.slug,
        nombre: i.titulo,
        varianteNombre: i.varianteNombre,
        precio: i.precioUnitario,
        cantidad: i.cantidad,
      })),
    });

    const preferencia = await crearPreferenciaMercadoPago({
      referencia,
      items: items.map((i) => ({
        titulo: i.titulo,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
      })),
      emailComprador: email,
    });

    return NextResponse.json({
      url: preferencia.init_point,
      referencia,
    });
  } catch (err) {
    console.error("Error creando preferencia de Mercado Pago:", err);
    return NextResponse.json(
      {
        error:
          "No se pudo generar el pago con Mercado Pago. Verifica las credenciales y la conexión a la base de datos.",
      },
      { status: 500 }
    );
  }
}
