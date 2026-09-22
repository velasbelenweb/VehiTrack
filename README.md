# Belén Resplandor de Luz — tienda propia (fuera de Shopify)

Tienda en Next.js 14 (App Router + TypeScript + Tailwind) con:

- **Base de datos real (PostgreSQL vía Prisma)** para productos y pedidos.
- **Panel de administración** en `/admin` para crear, editar y eliminar
  productos (con subida de imagen), y ver los pedidos recibidos.
- **Pagos reales con Wompi y Mercado Pago**, con webhooks que confirman el
  pago del lado del servidor y actualizan el pedido en la base de datos.

Lista para subir a GitHub y desplegar en Render.

## 1. Qué incluye

- Home, Catálogo, Ficha de producto, Carrito, Checkout, Empresa, Contacto.
- `/admin` (protegido con usuario/contraseña):
  - Dashboard con totales de productos, pedidos y ventas.
  - `/admin/productos`: listar, crear, editar y eliminar productos. Puedes
    subir una imagen desde tu computador (se guarda en la base de datos) o
    pegar una URL de imagen ya publicada. Cada producto puede tener
    variantes (ej. tamaños o colores) con su propio precio.
  - `/admin/pedidos`: lista de pedidos con estado (pendiente/pagado/fallido),
    datos del cliente y el detalle de productos comprados.
- Checkout con dos botones: **Pagar con Wompi** y **Pagar con Mercado Pago**.
  Cada uno crea primero una orden `pendiente` en la base de datos y luego
  redirige a la pasarela real de pago.
- Webhooks (`/api/checkout/wompi/webhook` y
  `/api/checkout/mercadopago/webhook`) que reciben la confirmación real del
  pago y marcan el pedido como `pagado` o `fallido` — **esta es la única
  fuente de verdad**, no el simple regreso del navegador a `/gracias`.
- Formulario de contacto (`/api/contacto`), listo para conectar a un
  proveedor de correo.
- 7 productos de muestra listos para sembrar en la base de datos
  (`prisma/seed.ts`), con la misma apariencia del sitio original.

## 2. Cómo funciona el catálogo ahora

Ya no hay un archivo estático de productos: todo vive en PostgreSQL y se
administra desde `/admin/productos`. Puedes:

- Agregar tus productos reales manualmente desde el admin (nombre, precio,
  descripción, imagen, categoría, variantes).
- O, si más adelante Shopify te entrega el CSV, puedo ayudarte a escribir un
  script que lo lea e inserte los productos automáticamente en la base de
  datos usando `prisma/seed.ts` como plantilla.

Las **categorías** (Aromaterapia, Arte religioso, Higiene, Velas e
Iluminación) siguen siendo una lista fija en `src/lib/products.ts` — son
pocas y no cambian con frecuencia. Si quieres poder editarlas también desde
el admin, se puede convertir en una tabla más adelante.

## 3. Cómo probar en tu computador

### 3.1 Base de datos local

Necesitas una base de datos PostgreSQL para desarrollar. La forma más rápida:

**Opción A — Docker (recomendada):**
```bash
docker run --name belen-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=belen_store -p 5432:5432 -d postgres:16
```

**Opción B — Postgres gratuito en la nube:** crea una base de datos gratis en
[Render](https://dashboard.render.com/) (New + → PostgreSQL), [Neon](https://neon.tech)
o [Supabase](https://supabase.com) y copia la URL de conexión.

### 3.2 Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` y define al menos:
- `DATABASE_URL` (la de tu Postgres local o en la nube)
- `ADMIN_USER` y `ADMIN_PASSWORD` (para entrar a `/admin`)
- Las llaves de Wompi y Mercado Pago en modo **prueba/sandbox** para simular
  compras sin cobrar dinero real.

### 3.3 Instalar, migrar y sembrar datos

```bash
npm install
npx prisma generate
npm run db:push      # crea las tablas en tu base de datos
npm run db:seed      # inserta los 7 productos de muestra
npm run dev
```

Abre http://localhost:3000 para la tienda, y http://localhost:3000/admin
para el panel de administración (te pedirá el usuario/contraseña que
configuraste).

## 4. Subir a GitHub

```bash
git init
git add .
git commit -m "Sitio Belén Resplandor de Luz"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/belen-resplandor-de-luz.git
git push -u origin main
```

`.env.local` nunca se sube (ya está en `.gitignore`).

## 5. Desplegar en Render

**Con el archivo `render.yaml` incluido (recomendado):**

1. En Render → *New +* → *Blueprint* → conecta tu repositorio de GitHub.
2. Render lee `render.yaml` y crea automáticamente:
   - Una base de datos PostgreSQL gratuita.
   - El servicio web, ya conectado a esa base de datos (`DATABASE_URL` se
     configura sola).
3. Ve a la pestaña **Environment** del servicio web y completa manualmente:
   - `NEXT_PUBLIC_SITE_URL` → la URL que Render te asigna (ej.
     `https://belen-resplandor-de-luz.onrender.com`)
   - `ADMIN_USER` / `ADMIN_PASSWORD`
   - `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`
   - `MERCADOPAGO_ACCESS_TOKEN`
4. Deploy. El build ya incluye `prisma generate` y `prisma db push`, así que
   las tablas se crean solas en el primer despliegue.
5. Para cargar los productos de muestra en producción, entra a la pestaña
   **Shell** del servicio en Render y corre:
   ```bash
   npm run db:seed
   ```
   (o crea tus productos reales directamente desde `/admin/productos`).

Después de desplegar, si conectas un dominio propio, actualiza
`NEXT_PUBLIC_SITE_URL` y vuelve a desplegar para que las URLs de retorno de
pago apunten al dominio correcto.

## 6. Configurar los webhooks en cada pasarela

- **Wompi**: panel de comercio → *Desarrolladores* → *Eventos* → agrega
  `https://tu-dominio.com/api/checkout/wompi/webhook`.
- **Mercado Pago**: se configura automáticamente vía `notification_url` en
  cada preferencia de pago (ya está en el código), pero puedes verificarlo o
  ajustarlo en el panel de tu aplicación → *Webhooks*.

## 7. Seguridad del panel de administración

`/admin` está protegido con autenticación HTTP básica (`ADMIN_USER` /
`ADMIN_PASSWORD` definidos como variables de entorno) mediante
`src/middleware.ts`. Es sencillo pero efectivo para un solo administrador.
Si más adelante necesitas varios usuarios con distintos permisos, esto se
puede reemplazar por una solución de autenticación completa (ej. NextAuth).

**Importante:** usa una contraseña robusta y sirve el sitio siempre por
HTTPS (Render lo hace automáticamente) — la autenticación básica envía las
credenciales en cada request y solo es segura sobre una conexión cifrada.

## 8. Estructura del proyecto

```
prisma/
  schema.prisma        -> modelos: Product, ProductVariant, Order, OrderItem
  seed.ts               -> productos de muestra

src/
  middleware.ts          -> protege /admin con usuario/contraseña
  app/
    admin/                -> panel de administración
      productos/          -> listar, crear, editar, eliminar (Server Actions)
      pedidos/             -> listado de pedidos
    api/checkout/wompi/           -> crea la orden + el pago
    api/checkout/wompi/webhook/   -> confirma el pago (Wompi -> servidor)
    api/checkout/mercadopago/         -> crea la orden + la preferencia de pago
    api/checkout/mercadopago/webhook/ -> confirma el pago (MP -> servidor)
    api/contacto/       -> recibe el formulario de contacto
    producto/[slug]/    -> ficha de producto
    catalogo/, carrito/, checkout/, empresa/, contacto/, gracias/
  components/
    admin/               -> formulario de producto, botón eliminar
  context/CartContext.tsx  -> estado del carrito (localStorage)
  lib/
    db.ts                 -> cliente Prisma singleton
    products.ts            -> lectura de productos (BD) + categorías fijas
    productAdmin.ts        -> crear/actualizar/eliminar productos
    orders.ts               -> crear orden pendiente, marcarla pagada/fallida
    wompi.ts                -> firma de integridad + URL de Web Checkout
    mercadopago.ts           -> creación de preferencias de pago
```

## 9. Pendientes recomendados antes de vender en serio

1. **Imágenes reales**: reemplaza las imágenes de muestra por fotos reales
   de tus productos (se suben directamente desde `/admin/productos`).
2. **Correo de confirmación**: conecta `/api/contacto` y los webhooks a un
   proveedor de correo (ej. [Resend](https://resend.com)) para notificar al
   cliente y al negocio cuando entra un pedido o mensaje.
3. **Backups de la base de datos**: Render Postgres free tier no incluye
   backups automáticos a largo plazo — considera el plan pagado o exporta
   periódicamente con `pg_dump` si el negocio ya factura en serio.
4. **Varios administradores**: si más de una persona va a gestionar el
   catálogo, vale la pena migrar la autenticación del admin a algo más
   completo (NextAuth, Clerk, etc.) con usuarios y roles individuales.
