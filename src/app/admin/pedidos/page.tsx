import { getOrdenes } from "@/lib/orders";
import { formatCOP } from "@/lib/products";

export const dynamic = "force-dynamic";

const estiloEstado: Record<string, string> = {
  pagado: "bg-green-100 text-green-700",
  pendiente: "bg-yellow-100 text-yellow-700",
  fallido: "bg-red-100 text-red-700",
};

export default async function AdminPedidosPage() {
  const ordenes = await getOrdenes();

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-bold text-ink">Pedidos</h1>

      <div className="grid gap-4">
        {ordenes.map((orden) => (
          <details
            key={orden.id}
            className="rounded-2xl border border-ink/15 bg-white p-5"
          >
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display font-semibold text-ink">
                  {orden.referencia}
                </p>
                <p className="text-xs text-ink/50">
                  {orden.createdAt.toLocaleString("es-CO")} · {orden.metodo} ·{" "}
                  {orden.nombreCliente || orden.emailCliente || "Sin datos"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    estiloEstado[orden.estado] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {orden.estado}
                </span>
                <span className="font-semibold text-ink">
                  {formatCOP(orden.total)}
                </span>
              </div>
            </summary>

            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="text-sm text-ink/70">
                Cliente: {orden.nombreCliente || "—"} · {orden.emailCliente || "—"} ·{" "}
                {orden.telefonoCliente || "—"}
              </p>
              <ul className="mt-3 grid gap-1 text-sm text-ink/70">
                {orden.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.nombre}
                      {item.varianteNombre && ` (${item.varianteNombre})`} ×{" "}
                      {item.cantidad}
                    </span>
                    <span>{formatCOP(item.precio * item.cantidad)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ))}

        {ordenes.length === 0 && (
          <p className="rounded-2xl border border-ink/15 bg-white p-6 text-ink/50">
            Todavía no hay pedidos registrados.
          </p>
        )}
      </div>
    </div>
  );
}
