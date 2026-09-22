"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatCOP } from "@/lib/products";

export default function CarritoPage() {
  const { items, updateQuantity, removeItem, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center md:px-8">
        <h1 className="font-display text-3xl font-bold text-ink">
          Tu carrito está vacío
        </h1>
        <p className="mt-3 text-ink/60">
          Explora nuestro catálogo y encuentra la vela perfecta para ti.
        </p>
        <Link
          href="/catalogo"
          className="btn-pill mt-6 inline-flex border-ink bg-ink text-white hover:opacity-90"
        >
          Ver catálogo
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 md:px-8">
      <h1 className="font-display text-3xl font-bold text-ink">Tu carrito</h1>

      <div className="mt-8 flex flex-col divide-y divide-ink/10">
        {items.map((item) => (
          <div
            key={`${item.slug}-${item.varianteId ?? "base"}`}
            className="flex items-center gap-4 py-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imagen}
              alt={item.nombre}
              className="h-20 w-20 rounded-xl object-cover"
            />
            <div className="flex-1">
              <p className="font-display font-semibold text-ink">
                {item.nombre}
              </p>
              {item.varianteNombre && (
                <p className="text-sm text-ink/50">{item.varianteNombre}</p>
              )}
              <p className="text-sm text-ink/70">{formatCOP(item.precio)}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateQuantity(item.slug, item.cantidad - 1, item.varianteId)
                }
                className="h-8 w-8 rounded-full border border-ink/30 text-ink"
                aria-label="Disminuir cantidad"
              >
                −
              </button>
              <span className="w-6 text-center text-ink">
                {item.cantidad}
              </span>
              <button
                onClick={() =>
                  updateQuantity(item.slug, item.cantidad + 1, item.varianteId)
                }
                className="h-8 w-8 rounded-full border border-ink/30 text-ink"
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>

            <p className="w-28 text-right font-semibold text-ink">
              {formatCOP(item.precio * item.cantidad)}
            </p>

            <button
              onClick={() => removeItem(item.slug, item.varianteId)}
              className="text-ink/40 hover:text-red-600"
              aria-label="Eliminar producto"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-end gap-4 border-t border-ink/10 pt-6">
        <p className="text-xl font-semibold text-ink">
          Total: {formatCOP(totalPrice)}
        </p>
        <Link
          href="/checkout"
          className="btn-pill border-ink bg-ink text-white hover:opacity-90"
        >
          Ir a pagar
        </Link>
      </div>
    </section>
  );
}
