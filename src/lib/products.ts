// Capa de acceso a datos de productos, ahora respaldada por PostgreSQL (Prisma).
// Las categorías siguen siendo una lista fija en código: son pocas y no
// cambian con frecuencia. Si más adelante quieres editarlas desde el admin,
// se pueden convertir en un modelo Category en prisma/schema.prisma.

import { prisma } from "@/lib/db";
import type { Product as PrismaProduct, ProductVariant } from "@prisma/client";

export type { ProductVariant };
export type Product = PrismaProduct & { variantes: ProductVariant[] };

export type Categoria = {
  slug: string;
  nombre: string;
  imagen: string;
};

export const categorias: Categoria[] = [
  {
    slug: "aromaterapia-espiritual",
    nombre: "Aromaterapia y Productos Espirituales",
    imagen: "/productos/categoria-aromaterapia.jpg",
  },
  {
    slug: "arte-religioso",
    nombre: "Arte religioso y artículos devocionales",
    imagen: "/productos/categoria-arte-religioso.jpg",
  },
  {
    slug: "higiene-bienestar",
    nombre: "Higiene y Bienestar Natural",
    imagen: "/productos/categoria-higiene.jpg",
  },
  {
    slug: "velas-iluminacion",
    nombre: "Velas y Artículos Religiosos de Iluminación",
    imagen: "/productos/categoria-velas.jpg",
  },
];

export function getCategoriaByPath(slug: string) {
  return categorias.find((c) => c.slug === slug);
}

export async function getProductos(): Promise<Product[]> {
  return prisma.product.findMany({
    include: { variantes: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return prisma.product.findUnique({
    where: { slug },
    include: { variantes: true },
  });
}

export async function getProductById(id: string): Promise<Product | null> {
  return prisma.product.findUnique({
    where: { id },
    include: { variantes: true },
  });
}

export async function getProductosByCategoria(
  categoriaSlug: string
): Promise<Product[]> {
  return prisma.product.findMany({
    where: { categoriaSlug },
    include: { variantes: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDestacados(): Promise<Product[]> {
  return prisma.product.findMany({
    where: { destacado: true },
    include: { variantes: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
}

// Usado por el selector de catálogo (SelectorLiturgico) para saber, sin
// tener que consultar producto por producto, cuáles de las ~200 referencias
// del árbol ya fueron cargadas como producto real desde el panel Admin.
export async function getAllSlugs(): Promise<string[]> {
  const productos = await prisma.product.findMany({ select: { slug: true } });
  return productos.map((p) => p.slug);
}

export function formatCOP(valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

export function slugify(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
