export default function EmpresaPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 md:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">
        Belén Resplandor de Luz
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink/70">
        Somos una empresa colombiana dedicada a la elaboración artesanal de
        velas aromáticas, cirios y artículos religiosos. Cada producto está
        hecho con dedicación, buscando acompañar los momentos de fe, calma y
        celebración de nuestros clientes en todo el país.
      </p>
      <p className="mt-4 text-lg leading-relaxed text-ink/70">
        Trabajamos con materias primas de calidad y procesos cuidadosos para
        garantizar velas duraderas, aromas exclusivos y un acabado fino en
        cada pieza, ya sea para uso personal, regalo o para parroquias y
        comunidades religiosas.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {[
          { titulo: "Elaboración artesanal", texto: "Cada vela se hace a mano, cuidando el detalle." },
          { titulo: "Envíos a toda Colombia", texto: "Gratis desde $300.000 en compras." },
          { titulo: "Atención personalizada", texto: "Te acompañamos para elegir el producto ideal." },
        ].map((item) => (
          <div key={item.titulo} className="rounded-2xl border border-ink/15 p-6">
            <h3 className="font-display font-semibold text-ink">{item.titulo}</h3>
            <p className="mt-2 text-sm text-ink/60">{item.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
