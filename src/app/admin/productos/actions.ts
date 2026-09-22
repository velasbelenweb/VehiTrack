"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  type ProductoInput,
} from "@/lib/productAdmin";

function leerProductoDeFormData(formData: FormData): ProductoInput {
  const variantesJson = String(formData.get("variantesJson") ?? "[]");
  let variantes: { nombre: string; precio: number }[] = [];
  try {
    variantes = JSON.parse(variantesJson);
  } catch {
    variantes = [];
  }

  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    referencia: String(formData.get("referencia") ?? "").trim() || undefined,
    descripcion: String(formData.get("descripcion") ?? "").trim(),
    precioBase: Number(formData.get("precioBase") ?? 0),
    imagen: String(formData.get("imagen") ?? "").trim(),
    imagenSecundaria: String(formData.get("imagenSecundaria") ?? "").trim() || undefined,
    categoriaSlug: String(formData.get("categoriaSlug") ?? ""),
    destacado: formData.get("destacado") === "on",
    variantes: variantes
      .filter((v) => v.nombre?.trim())
      .map((v) => ({ nombre: v.nombre.trim(), precio: Number(v.precio) || 0 })),
  };
}

export async function crearProductoAction(formData: FormData) {
  const input = leerProductoDeFormData(formData);

  if (!input.nombre || !input.descripcion || !input.imagen || !input.categoriaSlug) {
    throw new Error("Faltan campos obligatorios del producto.");
  }

  await crearProducto(input);
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
  revalidatePath("/");
  redirect("/admin/productos");
}

export async function actualizarProductoAction(id: string, formData: FormData) {
  const input = leerProductoDeFormData(formData);

  if (!input.nombre || !input.descripcion || !input.imagen || !input.categoriaSlug) {
    throw new Error("Faltan campos obligatorios del producto.");
  }

  await actualizarProducto(id, input);
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
  revalidatePath("/");
  redirect("/admin/productos");
}

export async function eliminarProductoAction(id: string) {
  await eliminarProducto(id);
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
  revalidatePath("/");
}
