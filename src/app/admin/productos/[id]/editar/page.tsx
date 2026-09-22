import { notFound } from "next/navigation";
import { getProductById } from "@/lib/products";
import ProductoForm from "@/components/admin/ProductoForm";
import { actualizarProductoAction } from "@/app/admin/productos/actions";

export const dynamic = "force-dynamic";

export default async function EditarProductoPage({
  params,
}: {
  params: { id: string };
}) {
  const producto = await getProductById(params.id);
  if (!producto) return notFound();

  const actualizarConId = actualizarProductoAction.bind(null, producto.id);

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-bold text-ink">
        Editar producto
      </h1>
      <div className="max-w-2xl rounded-2xl border border-ink/15 bg-white p-6">
        <ProductoForm
          action={actualizarConId}
          textoBoton="Guardar cambios"
          valoresIniciales={{
            nombre: producto.nombre,
            referencia: producto.referencia ?? "",
            descripcion: producto.descripcion,
            precioBase: producto.precioBase,
            imagen: producto.imagen,
            imagenSecundaria: producto.imagenSecundaria ?? "",
            categoriaSlug: producto.categoriaSlug,
            destacado: producto.destacado,
            variantes: producto.variantes.map((v) => ({
              nombre: v.nombre,
              precio: v.precio,
            })),
          }}
        />
      </div>
    </div>
  );
}
