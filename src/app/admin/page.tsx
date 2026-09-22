import Link from "next/link";
import { getProductos } from "@/lib/products";
import { getOrdenes } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [productos, ordenes] = await Promise.all([getProductos(), getOrdenes()]);
  const pagados = ordenes.filter((o) => o.estado === "pagado");
  const totalVentas = pagados.reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-bold text-ink">Panel de administración</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/15 bg-white p-6">
          <p className="text-sm text-ink/50">Productos</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{productos.length}</p>
          <Link href="/admin/productos" className="mt-2 inline-block text-sm text-ink underline">
            Gestionar catálogo →
          </Link>
        </div>
        <div className="rounded-2xl border border-ink/15 bg-white p-6">
          <p className="text-sm text-ink/50">Pedidos pagados</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{pagados.length}</p>
          <Link href="/admin/pedidos" className="mt-2 inline-block text-sm text-ink underline">
            Ver pedidos →
          </Link>
        </div>
        <div className="rounded-2xl border border-ink/15 bg-white p-6">
          <p className="text-sm text-ink/50">Total vendido</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">
            {new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              maximumFractionDigits: 0,
            }).format(totalVentas)}
          </p>
        </div>
      </div>
    </div>
  );
}
