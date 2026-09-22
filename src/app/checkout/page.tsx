"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatCOP } from "@/lib/products";

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const [datos, setDatos] = useState({ nombre: "", email: "", telefono: "" });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-20 text-center md:px-8">
        <h1 className="font-display text-3xl font-bold text-ink">
          No tienes productos en tu carrito
        </h1>
      </section>
    );
  }

  async function pagarConWompi() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/wompi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: totalPrice,
          ...datos,
          items: items.map((i) => ({
            slug: i.slug,
            nombre: i.nombre,
            varianteNombre: i.varianteNombre,
            precio: i.precio,
            cantidad: i.cantidad,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo iniciar el pago con Wompi."
      );
      setCargando(false);
    }
  }

  async function pagarConMercadoPago() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: datos.email,
          nombre: datos.nombre,
          telefono: datos.telefono,
          items: items.map((i) => ({
            slug: i.slug,
            titulo: i.varianteNombre ? `${i.nombre} (${i.varianteNombre})` : i.nombre,
            varianteNombre: i.varianteNombre,
            cantidad: i.cantidad,
            precioUnitario: i.precio,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo iniciar el pago con Mercado Pago."
      );
      setCargando(false);
    }
  }

  const datosCompletos = datos.email.trim().length > 3;

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 md:px-8">
      <h1 className="font-display text-3xl font-bold text-ink">Checkout</h1>

      <div className="mt-6 rounded-2xl border border-ink/15 p-6">
        <h2 className="font-display font-semibold text-ink">Resumen</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink/70">
          {items.map((i) => (
            <li key={`${i.slug}-${i.varianteId ?? "base"}`} className="flex justify-between">
              <span>
                {i.nombre} {i.varianteNombre && `(${i.varianteNombre})`} × {i.cantidad}
              </span>
              <span>{formatCOP(i.precio * i.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-ink/10 pt-4 font-semibold text-ink">
          <span>Total</span>
          <span>{formatCOP(totalPrice)}</span>
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        <h2 className="font-display font-semibold text-ink">Tus datos</h2>
        <input
          placeholder="Nombre completo"
          value={datos.nombre}
          onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
          className="rounded-pill border border-ink/30 px-5 py-3 outline-none"
        />
        <input
          type="email"
          required
          placeholder="Correo electrónico *"
          value={datos.email}
          onChange={(e) => setDatos({ ...datos, email: e.target.value })}
          className="rounded-pill border border-ink/30 px-5 py-3 outline-none"
        />
        <input
          placeholder="Teléfono (WhatsApp)"
          value={datos.telefono}
          onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
          className="rounded-pill border border-ink/30 px-5 py-3 outline-none"
        />
      </div>

      <div className="mt-8 grid gap-4">
        <h2 className="font-display font-semibold text-ink">
          Método de pago
        </h2>

        <button
          disabled={!datosCompletos || cargando}
          onClick={pagarConWompi}
          className="btn-pill w-full justify-center border-ink bg-ink text-white disabled:opacity-40"
        >
          {cargando ? "Redirigiendo…" : "Pagar con Wompi"}
        </button>

        <button
          disabled={!datosCompletos || cargando}
          onClick={pagarConMercadoPago}
          className="btn-pill w-full justify-center border-ink text-ink disabled:opacity-40"
        >
          {cargando ? "Redirigiendo…" : "Pagar con Mercado Pago"}
        </button>

        {!datosCompletos && (
          <p className="text-center text-xs text-ink/50">
            Ingresa tu correo electrónico para continuar.
          </p>
        )}
        {error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}
        <p className="text-center text-xs text-ink/40">
          Serás redirigido a la pasarela de pago para completar tu compra de
          forma segura. Tu pedido se confirma solo cuando el pago es aprobado.
        </p>
      </div>
    </section>
  );
}
