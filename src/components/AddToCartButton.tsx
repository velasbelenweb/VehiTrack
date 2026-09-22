"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Product, ProductVariant } from "@/lib/products";

export default function AddToCartButton({
  product,
  variante,
  className = "",
}: {
  product: Product;
  variante?: ProductVariant;
  className?: string;
}) {
  const { addItem } = useCart();
  const [agregado, setAgregado] = useState(false);

  function handleClick() {
    addItem({
      slug: product.slug,
      nombre: product.nombre,
      precio: variante?.precio ?? product.precioBase,
      imagen: product.imagen,
      varianteId: variante?.id,
      varianteNombre: variante?.nombre,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1500);
  }

  return (
    <button
      onClick={handleClick}
      className={`btn-pill border-ink bg-ink text-white hover:opacity-90 ${className}`}
    >
      {agregado ? "¡Agregado! ✓" : "Agregar al carrito"}
    </button>
  );
}
