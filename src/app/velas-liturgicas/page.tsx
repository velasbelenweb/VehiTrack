import SelectorLiturgico from "@/components/SelectorLiturgico";
import { getAllSlugs } from "@/lib/products";

export const metadata = {
  title: "Explora nuestras líneas | Belén Resplandor de Luz",
  description:
    "Recorre nuestras líneas de productos —veladoras, cirios, desahumerios, artículos religiosos y más— y consulta disponibilidad por WhatsApp.",
};

export default async function VelasLiturgicasPage() {
  const slugsExistentes = await getAllSlugs();
  return <SelectorLiturgico slugsExistentes={slugsExistentes} />;
}
