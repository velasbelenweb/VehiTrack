import Link from "next/link";
import { getProductos, formatCOP, categorias } from "@/lib/products";
import { eliminarProductoAction } from "@/app/admin/productos/actions";
import EliminarProductoButton from "@/components/admin/EliminarProductoButton";

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  const productos = await getProductos();

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-ink">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="btn-pill border-ink bg-ink text-white hover:opacity-90"
        >
          + Nuevo producto
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink/15 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/50">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Destacado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-ink/5">
                <td className="flex items-center gap-3 px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imagen}
                    alt={p.nombre}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <span className="font-medium text-ink">{p.nombre}</span>
                </td>
                <td className="px-4 py-3 text-ink/70">
                  {categorias.find((c) => c.slug === p.categoriaSlug)?.nombre ??
                    p.categoriaSlug}
                </td>
                <td className="px-4 py-3 text-ink/70">
                  {formatCOP(p.precioBase)}
                  {p.variantes.length > 0 && (
                    <span className="ml-1 text-xs text-ink/40">
                      +{p.variantes.length} variante(s)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{p.destacado ? "Sí" : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/admin/productos/${p.id}/editar`}
                      className="text-sm text-ink underline"
                    >
                      Editar
                    </Link>
                    <EliminarProductoButton id={p.id} action={eliminarProductoAction} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {productos.length === 0 && (
          <p className="p-6 text-ink/50">
            Aún no tienes productos. Crea el primero con &quot;+ Nuevo producto&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
