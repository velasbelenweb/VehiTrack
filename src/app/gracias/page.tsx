"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function GraciasPage() {
  return (
    <Suspense fallback={null}>
      <GraciasContenido />
    </Suspense>
  );
}

function GraciasContenido() {
  const params = useSearchParams();
  const referencia = params.get("ref");
  const estado = params.get("estado");
  const { clearCart } = useCart();

  useEffect(() => {
    // Vaciamos el carrito visualmente al volver de la pasarela. La
    // confirmación real del pago llega por el webhook server-side, que es la
    // única fuente de verdad para marcar el pedido como pagado.
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center md:px-8">
      <h1 className="font-display text-3xl font-bold text-ink">
        {estado === "pendiente"
          ? "Tu pago está siendo procesado"
          : "¡Gracias por tu compra!"}
      </h1>
      <p className="mt-4 text-ink/70">
        {estado === "pendiente"
          ? "Te avisaremos por correo apenas se confirme el pago."
          : "Hemos recibido tu pedido. Te contactaremos para coordinar el envío."}
      </p>
      {referencia && (
        <p className="mt-2 text-sm text-ink/50">
          Número de referencia: {referencia}
        </p>
      )}
      <Link
        href="/"
        className="btn-pill mt-8 inline-flex border-ink bg-ink text-white hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
