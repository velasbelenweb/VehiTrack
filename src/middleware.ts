import { NextRequest, NextResponse } from "next/server";

// Protege todo /admin (incluidas las Server Actions que se ejecutan contra
// esas mismas rutas) con autenticación HTTP Basic. Es una protección simple
// y suficiente para un panel de un solo administrador; si más adelante
// necesitas varios usuarios o roles, reemplaza esto por NextAuth u otra
// solución de autenticación completa.
//
// Variables de entorno necesarias: ADMIN_USER, ADMIN_PASSWORD

export function middleware(req: NextRequest) {
  const usuario = process.env.ADMIN_USER;
  const clave = process.env.ADMIN_PASSWORD;

  if (!usuario || !clave) {
    return new NextResponse(
      "El panel de administración no está configurado. Define ADMIN_USER y ADMIN_PASSWORD en las variables de entorno.",
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice(6));
    const separador = decoded.indexOf(":");
    const user = decoded.slice(0, separador);
    const pass = decoded.slice(separador + 1);

    if (user === usuario && pass === clave) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Autenticación requerida", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin Belén Resplandor de Luz"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
