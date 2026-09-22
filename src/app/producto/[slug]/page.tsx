import { notFound } from "next/navigation";
import { getProductBySlug, formatCOP } from "@/lib/products";
import AddToCartButton from "@/components/AddToCartButton";
import MultiVariantSelector from "@/components/MultiVariantSelector";
import ProductGallery from "@/components/ProductGallery";
import CinematicReveal from "@/components/CinematicReveal";

export const dynamic = "force-dynamic";

export default async function ProductoPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);
  if (!product) return notFound();

  const imagenes = [product.imagen, product.imagenSecundaria].filter(
    (src): src is string => Boolean(src)
  );

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:px-8">
      <CinematicReveal variant="wipe-right">
        <ProductGallery imagenes={imagenes} alt={product.nombre} />
      </CinematicReveal>

      <CinematicReveal variant="fade-up" delay={150}>
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-3xl font-bold text-ink">
            {product.nombre}
          </h1>
          {product.referencia && (
            <p className="text-sm text-ink/50">Ref: {product.referencia}</p>
          )}
          {product.variantes.length === 0 && (
            <p className="text-xl font-semibold text-ink">
              {formatCOP(product.precioBase)}
            </p>
          )}
          <p className="text-ink/70">{product.descripcion}</p>

          <div className="mt-2">
            {product.variantes.length > 0 ? (
              <MultiVariantSelector product={product} />
            ) : (
              <AddToCartButton product={product} className="w-full sm:w-auto" />
            )}
          </div>
        </div>
      </CinematicReveal>
    </section>
  );
}
