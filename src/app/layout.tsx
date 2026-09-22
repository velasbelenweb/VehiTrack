import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import CinematicIntro from "@/components/CinematicIntro";

export const metadata: Metadata = {
  title: "Belén Resplandor de Luz | Velas artesanales y artículos religiosos",
  description:
    "Velas aromáticas, cirios pascuales y artículos religiosos hechos con dedicación. Envíos a toda Colombia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-body antialiased">
        <CinematicIntro />
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <WhatsAppButton />
        </CartProvider>
      </body>
    </html>
  );
}
