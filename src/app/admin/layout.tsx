import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/admin" className="font-display text-lg font-semibold">
            Admin · Belén Resplandor de Luz
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/admin/productos" className="hover:underline">
              Productos
            </Link>
            <Link href="/admin/pedidos" className="hover:underline">
              Pedidos
            </Link>
            <Link href="/" className="hover:underline" target="_blank">
              Ver sitio ↗
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">{children}</main>
    </div>
  );
}
