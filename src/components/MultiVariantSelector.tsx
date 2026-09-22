"use client";

import { useMemo, useState } from "react";
import { Product, formatCOP } from "@/lib/products";
import { useCart } from "@/context/CartContext";

// Mismo mapa de colores usado en la ficha visual del selector de catálogo,
// para que un color se vea igual en todo el sitio.
const COLOR_SWATCHES: Record<string, string> = {
  blanco: "#FFFFFF",
  "azul marino": "#1B2A6B",
  celeste: "#7EC8E3",
  amarillo: "#F2C230",
  verde: "#1F5C3A",
  rojo: "#C21F26",
  naranja: "#E8731A",
  rosado: "#F0A8C4",
  morado: "#5B2A86",
  negro: "#111111",
  azul: "#2453A6",
};

/**
 * Selector de variantes con cantidad individual por opción (ej. "3 rojas,
 * 2 azules, 1 negra"), pensado para productos como la Veladora No. 1 que
 * vienen en varios colores al mismo precio. Calcula el total en vivo y
 * agrega al carrito una línea por cada color con cantidad > 0.
 */
export default function MultiVariantSelector({ product }: { product: Product }) {
  const { addItem } = useCart();
  const variantes = product.variantes ?? [];
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [agregado, setAgregado] = useState(false);

  const totalUnidades = useMemo(
    () => Object.values(cantidades).reduce((sum, n) => sum + n, 0),
    [cantidades]
  );

  const totalCosto = useMemo(
    () =>
      variantes.reduce((sum, v) => sum + (cantidades[v.id] ?? 0) * v.precio, 0),
    [cantidades, variantes]
  );

  function cambiarCantidad(varianteId: string, delta: number) {
    setCantidades((prev) => {
      const actual = prev[varianteId] ?? 0;
      const nueva = Math.max(0, actual + delta);
      return { ...prev, [varianteId]: nueva };
    });
  }

  function agregarAlCarrito() {
    variantes.forEach((v) => {
      const cantidad = cantidades[v.id] ?? 0;
      if (cantidad > 0) {
        addItem(
          {
            slug: product.slug,
            nombre: product.nombre,
            precio: v.precio,
            imagen: product.imagen,
            varianteId: v.id,
            varianteNombre: v.nombre,
          },
          cantidad
        );
      }
    });
    setCantidades({});
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  }

  if (variantes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        {variantes.map((v) => {
          const swatch = COLOR_SWATCHES[v.nombre.trim().toLowerCase()];
          const cantidad = cantidades[v.id] ?? 0;
          return (
            <div
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink/15 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {swatch && (
                  <span
                    className="h-5 w-5 flex-none rounded-full border border-ink/20"
                    style={{ backgroundColor: swatch }}
                    aria-hidden="true"
                  />
                )}
                <div>
                  <p className="font-medium text-ink">{v.nombre}</p>
                  <p className="text-sm text-ink/50">{formatCOP(v.precio)} c/u</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => cambiarCantidad(v.id, -1)}
                  disabled={cantidad === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/30 text-ink disabled:opacity-30"
                  aria-label={`Quitar una unidad de ${v.nombre}`}
                >
                  −
                </button>
                <span className="w-6 text-center font-medium text-ink">{cantidad}</span>
                <button
                  type="button"
                  onClick={() => cambiarCantidad(v.id, 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/30 text-ink hover:border-ink"
                  aria-label={`Agregar una unidad de ${v.nombre}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-ink/5 px-4 py-3">
        <span className="text-sm text-ink/70">
          {totalUnidades} {totalUnidades === 1 ? "unidad" : "unidades"}
        </span>
        <span className="text-lg font-semibold text-ink">{formatCOP(totalCosto)}</span>
      </div>

      <button
        type="button"
        onClick={agregarAlCarrito}
        disabled={totalUnidades === 0}
        className="btn-pill w-full border-ink bg-ink text-white hover:opacity-90 disabled:opacity-40 sm:w-auto"
      >
        {agregado ? "¡Agregado! ✓" : "Agregar al carrito"}
      </button>
    </div>
  );
}
