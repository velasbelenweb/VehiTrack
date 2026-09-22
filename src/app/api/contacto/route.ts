import { NextRequest, NextResponse } from "next/server";

// Recibe el formulario de contacto. Por ahora solo lo registra en el log del
// servidor. Para producción, conéctalo a un servicio de correo (Resend,
// SendGrid, Postmark) o guarda el mensaje en una base de datos.
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let datos: Record<string, string> = {};

  if (contentType.includes("application/json")) {
    datos = await req.json();
  } else {
    const form = await req.formData();
    form.forEach((value, key) => (datos[key] = String(value)));
  }

  console.log("Nuevo mensaje de contacto:", datos);

  // TODO: enviar correo real, por ejemplo con Resend:
  // await resend.emails.send({ to: "contacto@belenresplandordeluz.com", ... })

  const isForm = !contentType.includes("application/json");
  if (isForm) {
    return NextResponse.redirect(new URL("/contacto?enviado=1", req.url));
  }
  return NextResponse.json({ ok: true });
}
