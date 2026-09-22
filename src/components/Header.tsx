"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/velas-liturgicas", label: "Explora nuestras líneas" },
  { href: "/empresa", label: "Empresa" },
  { href: "/contacto", label: "Contacto" },
];

export default function Header() {
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-brand-dark text-white text-center text-sm font-semibold py-2 px-4">
        Envío gratis a cualquier destino de Colombia por compras iguales o
        superiores a $300.000
      </div>
      <header className="bg-brand-light">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Belén Resplandor de Luz"
              className="h-14 w-auto object-contain md:h-16"
            />
          </Link>

          <nav className="hidden gap-8 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-medium text-ink hover:underline"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/carrito"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/40 text-ink"
              aria-label="Ver carrito"
            >
              🛍️
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs text-white">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              className="md:hidden"
              aria-label="Abrir menú"
              onClick={() => setOpen((v) => !v)}
            >
              ☰
            </button>
          </div>
        </div>

        {open && (
          <nav className="flex flex-col gap-3 bg-brand-light px-4 pb-4 md:hidden">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-medium text-ink"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  );
}
