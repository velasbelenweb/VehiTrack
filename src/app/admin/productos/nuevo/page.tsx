import ProductoForm from "@/components/admin/ProductoForm";
import { crearProductoAction } from "@/app/admin/productos/actions";

export default function NuevoProductoPage() {
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-bold text-ink">Nuevo producto</h1>
      <div className="max-w-2xl rounded-2xl border border-ink/15 bg-white p-6">
        <ProductoForm action={crearProductoAction} textoBoton="Crear producto" />
      </div>
    </div>
  );
}
