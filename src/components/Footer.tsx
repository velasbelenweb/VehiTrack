export default function Footer() {
  return (
    <footer>
      <div className="bg-gray-200 py-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-6 px-4 text-sm font-bold text-ink">
          <span>VISA</span>
          <span>Mastercard</span>
          <span>Maestro</span>
          <span>Visa Debit</span>
          <span>Mastercard Debit</span>
          <span>Visa Electron</span>
        </div>
      </div>

      <div className="bg-brand-light py-14 text-center">
        <h2 className="font-display text-2xl font-bold text-white md:text-3xl">
          Suscríbete a nuestras novedades
        </h2>
        <p className="mt-2 text-white/90">
          Sé el primero en enterarte de ofertas y promociones exclusivas
        </p>
        <form className="mx-auto mt-6 flex max-w-md items-center gap-2 px-4">
          <input
            type="email"
            required
            placeholder="Correo electrónico"
            className="w-full rounded-pill border border-white/70 bg-transparent px-5 py-3 text-white placeholder-white/80 outline-none"
          />
          <button
            type="submit"
            aria-label="Suscribirme"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink"
          >
            →
          </button>
        </form>

        <div className="mx-auto mt-8 flex max-w-xs flex-wrap items-center justify-center gap-3 text-xs font-semibold text-white/90">
          <span>AMEX</span>
          <span>Diners</span>
          <span>Mastercard</span>
          <span>Visa</span>
        </div>

        <p className="mt-8 text-xs text-white/80">
          © {new Date().getFullYear()}, Belén Resplandor de Luz ·{" "}
          <a href="/politica-privacidad" className="underline">
            Política de privacidad
          </a>
        </p>
      </div>
    </footer>
  );
}
