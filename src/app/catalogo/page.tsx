import { categorias, getProductos, getProductosByCategoria } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import CinematicReveal from "@/components/CinematicReveal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: { categoria?: string };
}) {
  const categoriaActiva = searchParams.categoria;
  const lista = categoriaActiva
    ? await getProductosByCategoria(categoriaActiva)
    : await getProductos();

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
        Catálogo
      </h1>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/catalogo"
          className={`btn-pill border-ink/40 text-sm text-ink/70 hover:border-ink hover:text-ink ${
            !categoriaActiva ? "bg-ink text-white" : ""
          }`}
        >
          Todos
        </Link>
        {categorias.map((cat) => (
          <Link
            key={cat.slug}
            href={`/catalogo?categoria=${cat.slug}`}
            className={`btn-pill border-ink/40 text-sm text-ink/70 hover:border-ink hover:text-ink ${
              categoriaActiva === cat.slug ? "bg-ink text-white" : ""
            }`}
          >
            {cat.nombre}
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {lista.map((p, i) => (
          <CinematicReveal key={p.slug} variant="fade-up" delay={(i % 4) * 100}>
            <ProductCard product={p} />
          </CinematicReveal>
        ))}
      </div>

      {lista.length === 0 && (
        <p className="mt-10 text-ink/60">
          No hay productos en esta categoría todavía.
        </p>
      )}
    </section>
  );
}
