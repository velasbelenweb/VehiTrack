import { prisma } from "@/lib/db";
import { slugify } from "@/lib/products";

export type VarianteInput = {
  id?: string; // si viene, es una variante existente que se actualiza
  nombre: string;
  precio: number;
};

export type ProductoInput = {
  nombre: string;
  referencia?: string;
  descripcion: string;
  precioBase: number;
  imagen: string;
  imagenSecundaria?: string;
  categoriaSlug: string;
  destacado: boolean;
  variantes: VarianteInput[];
};

async function generarSlugUnico(nombre: string, ignorarId?: string) {
  const base = slugify(nombre) || "producto";
  let slug = base;
  let intento = 1;

  while (true) {
    const existente = await prisma.product.findUnique({ where: { slug } });
    if (!existente || existente.id === ignorarId) return slug;
    intento += 1;
    slug = `${base}-${intento}`;
  }
}

export async function crearProducto(input: ProductoInput) {
  const slug = await generarSlugUnico(input.nombre);

  return prisma.product.create({
    data: {
      slug,
      nombre: input.nombre,
      referencia: input.referencia || null,
      descripcion: input.descripcion,
      precioBase: input.precioBase,
      imagen: input.imagen,
      imagenSecundaria: input.imagenSecundaria || null,
      categoriaSlug: input.categoriaSlug,
      destacado: input.destacado,
      variantes: {
        create: input.variantes
          .filter((v) => v.nombre.trim())
          .map((v) => ({ nombre: v.nombre, precio: v.precio })),
      },
    },
    include: { variantes: true },
  });
}

export async function actualizarProducto(id: string, input: ProductoInput) {
  const actual = await prisma.product.findUnique({ where: { id } });
  if (!actual) throw new Error("Producto no encontrado");

  // Solo se regenera el slug si cambió el nombre, para no romper enlaces
  // existentes al producto cada vez que se edita cualquier otro campo.
  const slug =
    actual.nombre === input.nombre
      ? actual.slug
      : await generarSlugUnico(input.nombre, id);

  // Reemplazamos las variantes por completo: se borran las anteriores y se
  // crean las nuevas. Es más simple y confiable que hacer un diff manual.
  await prisma.productVariant.deleteMany({ where: { productId: id } });

  return prisma.product.update({
    where: { id },
    data: {
      slug,
      nombre: input.nombre,
      referencia: input.referencia || null,
      descripcion: input.descripcion,
      precioBase: input.precioBase,
      imagen: input.imagen,
      imagenSecundaria: input.imagenSecundaria || null,
      categoriaSlug: input.categoriaSlug,
      destacado: input.destacado,
      variantes: {
        create: input.variantes
          .filter((v) => v.nombre.trim())
          .map((v) => ({ nombre: v.nombre, precio: v.precio })),
      },
    },
    include: { variantes: true },
  });
}

export async function eliminarProducto(id: string) {
  return prisma.product.delete({ where: { id } });
}
