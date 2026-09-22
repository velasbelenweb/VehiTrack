export default function ContactoPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 md:px-8">
      <h1 className="font-display text-3xl font-bold text-ink text-center">
        Formulario de contacto
      </h1>
      <form
        action="/api/contacto"
        method="POST"
        className="mt-8 grid gap-4 rounded-2xl border border-ink/15 p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            name="nombre"
            placeholder="Nombre"
            className="rounded-pill border border-ink/30 px-5 py-3 outline-none"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Correo electrónico *"
            className="rounded-pill border border-ink/30 px-5 py-3 outline-none"
          />
        </div>
        <input
          name="telefono"
          placeholder="Número de teléfono"
          className="rounded-pill border border-ink/30 px-5 py-3 outline-none"
        />
        <textarea
          name="comentario"
          placeholder="Comentario"
          rows={5}
          className="rounded-2xl border border-ink/30 px-5 py-3 outline-none"
        />
        <button
          type="submit"
          className="btn-pill mx-auto border-ink bg-ink text-white hover:opacity-90"
        >
          Enviar
        </button>
      </form>
    </section>
  );
}
