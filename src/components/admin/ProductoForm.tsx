"use client";

import { useState } from "react";
import { categorias } from "@/lib/products";

type Variante = { nombre: string; precio: number };

export type ProductoFormValues = {
  nombre: string;
  referencia: string;
  descripcion: string;
  precioBase: number;
  imagen: string;
  imagenSecundaria: string;
  categoriaSlug: string;
  destacado: boolean;
  variantes: Variante[];
};

export default function ProductoForm({
  action,
  valoresIniciales,
  textoBoton = "Guardar producto",
}: {
  action: (formData: FormData) => void;
  valoresIniciales?: Partial<ProductoFormValues>;
  textoBoton?: string;
}) {
  const [imagen, setImagen] = useState(valoresIniciales?.imagen ?? "");
  const [imagenSecundaria, setImagenSecundaria] = useState(
    valoresIniciales?.imagenSecundaria ?? ""
  );
  const [precioBase, setPrecioBase] = useState(valoresIniciales?.precioBase ?? 0);
  const [variantes, setVariantes] = useState<Variante[]>(
    valoresIniciales?.variantes?.length ? valoresIniciales.variantes : []
  );
  const [subiendo, setSubiendo] = useState(false);
  const [subiendoSecundaria, setSubiendoSecundaria] = useState(false);

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    const reader = new FileReader();
    reader.onload = () => {
      setImagen(String(reader.result));
      setSubiendo(false);
    };
    reader.onerror = () => setSubiendo(false);
    reader.readAsDataURL(file);
  }

  function handleArchivoSecundaria(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoSecundaria(true);
    const reader = new FileReader();
    reader.onload = () => {
      setImagenSecundaria(String(reader.result));
      setSubiendoSecundaria(false);
    };
    reader.onerror = () => setSubiendoSecundaria(false);
    reader.readAsDataURL(file);
  }

  function agregarVariante() {
    setVariantes((v) => [...v, { nombre: "", precio: precioBase || 0 }]);
  }

  function igualarPrecioVariantes() {
    setVariantes((v) => v.map((item) => ({ ...item, precio: precioBase })));
  }

  function actualizarVariante(idx: number, campo: keyof Variante, valor: string) {
    setVariantes((v) =>
      v.map((item, i) =>
        i === idx
          ? { ...item, [campo]: campo === "precio" ? Number(valor) || 0 : valor }
          : item
      )
    );
  }

  function eliminarVariante(idx: number) {
    setVariantes((v) => v.filter((_, i) => i !== idx));
  }

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="imagen" value={imagen} />
      <input type="hidden" name="imagenSecundaria" value={imagenSecundaria} />
      <input
        type="hidden"
        name="variantesJson"
        value={JSON.stringify(variantes)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-ink/70">
          Nombre *
          <input
            name="nombre"
            required
            defaultValue={valoresIniciales?.nombre}
            className="rounded-xl border border-ink/30 px-4 py-2 text-ink outline-none"
          />
        </label>
        <label className="grid gap-1 text-sm text-ink/70">
          Referencia
          <input
            name="referencia"
            defaultValue={valoresIniciales?.referencia}
            className="rounded-xl border border-ink/30 px-4 py-2 text-ink outline-none"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm text-ink/70">
        Descripción *
        <textarea
          name="descripcion"
          required
          rows={4}
          defaultValue={valoresIniciales?.descripcion}
          className="rounded-xl border border-ink/30 px-4 py-2 text-ink outline-none"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-ink/70">
          Precio base (COP) *
          <input
            type="number"
            name="precioBase"
            min={0}
            required
            value={precioBase || ""}
            onChange={(e) => setPrecioBase(Number(e.target.value) || 0)}
            className="rounded-xl border border-ink/30 px-4 py-2 text-ink outline-none"
          />
          <span className="text-xs text-ink/40">
            Si el producto tiene variantes, este precio se usa como referencia
            en las tarjetas; cada variante puede tener su propio precio abajo
            (usa el botón &quot;Igualar precios&quot; si todas deben costar lo mismo).
          </span>
        </label>
        <label className="grid gap-1 text-sm text-ink/70">
          Categoría *
          <select
            name="categoriaSlug"
            required
            defaultValue={valoresIniciales?.categoriaSlug ?? ""}
            className="rounded-xl border border-ink/30 px-4 py-2 text-ink outline-none"
          >
            <option value="" disabled>
              Selecciona una categoría
            </option>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input
          type="checkbox"
          name="destacado"
          defaultChecked={valoresIniciales?.destacado}
          className="h-4 w-4"
        />
        Mostrar en &quot;Productos Destacados&quot; de la página de inicio
      </label>

      <div className="grid gap-2">
        <p className="text-sm text-ink/70">Imagen del producto *</p>
        <input type="file" accept="image/*" onChange={handleArchivo} />
        <p className="text-xs text-ink/40">
          O pega la URL de una imagen ya publicada en internet:
        </p>
        <input
          placeholder="https://..."
          value={imagen.startsWith("data:") ? "" : imagen}
          onChange={(e) => setImagen(e.target.value)}
          className="rounded-xl border border-ink/30 px-4 py-2 text-ink outline-none"
        />
        {subiendo && <p className="text-xs text-ink/40">Procesando imagen…</p>}
        {imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagen}
            alt="Vista previa"
            className="mt-2 h-40 w-40 rounded-xl border border-ink/15 object-cover"
          />
        )}
      </div>

      <div className="grid gap-2">
        <p className="text-sm text-ink/70">
          Segunda imagen (opcional — ej. una foto mostrando los colores disponibles)
        </p>
        <input type="file" accept="image/*" onChange={handleArchivoSecundaria} />
        <p className="text-xs text-ink/40">
          O pega la URL de una imagen ya publicada en internet:
        </p>
        <input
          placeholder="https://..."
          value={imagenSecundaria.startsWith("data:") ? "" : imagenSecundaria}
          onChange={(e) => setImagenSecundaria(e.target.value)}
          className="rounded-xl border border-ink/30 px-4 py-2 text-ink outline-none"
        />
        {subiendoSecundaria && (
          <p className="text-xs text-ink/40">Procesando imagen…</p>
        )}
        {imagenSecundaria && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagenSecundaria}
            alt="Vista previa segunda imagen"
            className="mt-2 h-40 w-40 rounded-xl border border-ink/15 object-cover"
          />
        )}
      </div>

      <div className="grid gap-3 rounded-2xl border border-ink/15 p-4">
        <div className="flex items-center justify-between">
          <p className="font-display font-semibold text-ink">
            Variantes (opcional)
          </p>
          <div className="flex gap-2">
            {variantes.length > 0 && (
              <button
                type="button"
                onClick={igualarPrecioVariantes}
                className="btn-pill border-ink/40 px-4 py-1.5 text-sm text-ink/70 hover:border-ink hover:text-ink"
              >
                Igualar precios al base
              </button>
            )}
            <button
              type="button"
              onClick={agregarVariante}
              className="btn-pill border-ink/40 px-4 py-1.5 text-sm text-ink/70 hover:border-ink hover:text-ink"
            >
              + Agregar variante
            </button>
          </div>
        </div>
        <p className="text-xs text-ink/40">
          Úsalas para tamaños, colores o aromas con precios distintos. Si no
          agregas ninguna, el producto se vende con el precio base.
        </p>
        {variantes.map((v, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              placeholder="Nombre (ej. Grande)"
              value={v.nombre}
              onChange={(e) => actualizarVariante(idx, "nombre", e.target.value)}
              className="flex-1 rounded-xl border border-ink/30 px-3 py-2 text-ink outline-none"
            />
            <input
              type="number"
              placeholder="Precio COP"
              min={0}
              value={v.precio || ""}
              onChange={(e) => actualizarVariante(idx, "precio", e.target.value)}
              className="w-32 rounded-xl border border-ink/30 px-3 py-2 text-ink outline-none"
            />
            <button
              type="button"
              onClick={() => eliminarVariante(idx)}
              className="text-ink/40 hover:text-red-600"
              aria-label="Eliminar variante"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={subiendo || !imagen}
        className="btn-pill w-fit border-ink bg-ink text-white hover:opacity-90 disabled:opacity-40"
      >
        {textoBoton}
      </button>
    </form>
  );
}
