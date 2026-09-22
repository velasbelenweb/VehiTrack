import Link from "next/link";
import { Product, formatCOP } from "@/lib/products";
import AddToCartButton from "@/components/AddToCartButton";

export default function ProductCard({ product }: { product: Product }) {
  const tieneVariantes = !!product.variantes?.length;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-ink/15 bg-white">
      <Link href={`/producto/${product.slug}`} className="block bg-cream">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imagen}
          alt={product.nombre}
          className="aspect-square w-full object-cover"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/producto/${product.slug}`}>
          <h3 className="font-display font-semibold text-ink">
            {product.nombre}
            {product.referencia && (
              <span className="block text-xs font-normal text-ink/60">
                Ref: {product.referencia}
              </span>
            )}
          </h3>
        </Link>
        <p className="font-semibold text-ink">
          {formatCOP(product.precioBase)}
        </p>
        <div className="mt-auto pt-2">
          {tieneVariantes ? (
            <Link
              href={`/producto/${product.slug}`}
              className="btn-pill w-full border-ink text-ink hover:bg-ink hover:text-white"
            >
              Seleccionar opciones
            </Link>
          ) : (
            <AddToCartButton product={product} className="w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
