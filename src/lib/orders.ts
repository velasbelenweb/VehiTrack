import { prisma } from "@/lib/db";

export type ItemOrdenInput = {
  productoSlug: string;
  nombre: string;
  varianteNombre?: string;
  precio: number;
  cantidad: number;
};

export async function crearOrdenPendiente({
  referencia,
  metodo,
  total,
  items,
  nombreCliente,
  emailCliente,
  telefonoCliente,
}: {
  referencia: string;
  metodo: "wompi" | "mercadopago";
  total: number;
  items: ItemOrdenInput[];
  nombreCliente?: string;
  emailCliente?: string;
  telefonoCliente?: string;
}) {
  return prisma.order.create({
    data: {
      referencia,
      metodo,
      total,
      nombreCliente,
      emailCliente,
      telefonoCliente,
      items: { create: items },
    },
  });
}

export async function marcarOrdenPagada(referencia: string) {
  return prisma.order.update({
    where: { referencia },
    data: { estado: "pagado" },
  });
}

export async function marcarOrdenFallida(referencia: string) {
  return prisma.order.update({
    where: { referencia },
    data: { estado: "fallido" },
  });
}

export async function getOrdenes() {
  return prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrdenPorReferencia(referencia: string) {
  return prisma.order.findUnique({
    where: { referencia },
    include: { items: true },
  });
}
