export default function WhatsAppButton() {
  // Reemplaza el número por el WhatsApp real del negocio (formato: 57XXXXXXXXXX)
  const numero = "573000000000";
  const mensaje = encodeURIComponent(
    "Hola, quiero más información sobre sus productos."
  );

  return (
    <a
      href={`https://wa.me/${numero}?text=${mensaje}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl text-white shadow-lg transition-transform hover:scale-105"
    >
      💬
    </a>
  );
}
