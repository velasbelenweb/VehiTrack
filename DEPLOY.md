# Guía de despliegue — VehiTrack

VehiTrack usa un **saldo recargable** (wallet en pesos, sin "créditos"
abstractos): recargas con Wompi, y cada consulta descuenta su costo
directo — **$20.000, un solo informe combinado** — al instante, sin
redirigir a Wompi en cada consulta.

El informe combina **dos fuentes**, llamadas en paralelo:
- **InfoSiniestral**: aseguradoras, SOAT, siniestros y avalúo comercial.
- **PlacApi**: RUNT, situación legal, SOAT, tecnomecánica, multas
  (SIMIT), impuestos, Fasecolda, pico y placa y licencia.

Cada consulta además queda guardada en el historial de la cuenta del
usuario (tabla `consultas`) y se envía una copia por correo al
usuario con **Resend**.

## 1. Crear el proyecto de Supabase

1. Ve a https://supabase.com/dashboard → **New project**.
2. Guarda la **contraseña de la base de datos**, la necesitarás para el CLI.
3. En **Project Settings → API** copia:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → **secreta**, solo para las Edge Functions

## 2. Crear las tablas (SQL Editor)

Ejecuta, en este orden, en **SQL Editor → New query**:

1. `verifica-backend.sql` (usuarios, wallet, tabla `consultas`, RLS)
2. `verifica-wallet-recarga.sql` (tabla `recargas` + función `sumar_creditos`)

> `verifica-consultas-pago.sql` y `verifica-suscripciones.sql` (de
> versiones anteriores) quedaron obsoletos — no hace falta correrlos en
> una instalación nueva.

## 3. Configurar tu comercio en Wompi

1. Regístrate en https://comercios.wompi.co (o el sandbox: https://comercios.wompi.co/sandbox).
2. En **Configuración → Llaves** copia:
   - **Llave pública** (`pub_test_...` / `pub_prod_...`) → va en `config.js`.
   - **Llave secreta de integridad** → secreta, firma el checkout de recarga.
   - **Events secret** → secreta, valida los webhooks.

## 3.1 Configurar Resend (copia del informe por correo)

1. Crea una cuenta gratis en https://resend.com (hasta 3.000 correos/mes).
2. **Verifica tu dominio** `vehitrack.app` en Resend → Domains → Add
   Domain. Te va a pedir agregar unos registros DNS (TXT/CNAME) en
   GoDaddy, igual que hiciste para apuntar el dominio a Render — te
   guío cuando llegues a ese paso.
3. En **API Keys**, crea una llave y cópiala (empieza con `re_...`).
4. Sin verificar el dominio, Resend solo te deja enviar correos de
   prueba a tu propia cuenta — para enviarle el informe a cualquier
   usuario real, el dominio tiene que estar verificado.

## 4. Desplegar las Edge Functions

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU-PROJECT-REF
```

Secretos:

```bash
supabase secrets set WOMPI_PUBLIC_KEY=pub_test_tu_llave_publica
supabase secrets set WOMPI_INTEGRITY_SECRET=tu_llave_secreta_de_integridad
supabase secrets set WOMPI_EVENTS_SECRET=tu_events_secret
supabase secrets set INFOSINIESTRAL_API_KEY=isk_tu_llave_de_infosiniestral
supabase secrets set PLACAPI_API_KEY=tu_llave_de_placapi
supabase secrets set RESEND_API_KEY=re_tu_llave_de_resend
supabase secrets set RESEND_FROM="VehiTrack <informes@vehitrack.app>"
```

Desplegar (3 funciones):

```bash
supabase functions deploy wompi-webhook --no-verify-jwt
supabase functions deploy recarga-firma
supabase functions deploy consulta
```

En el panel de Wompi, configura el webhook apuntando a:
`https://TU-PROYECTO.supabase.co/functions/v1/wompi-webhook`

## 5. Completar config.js

```js
window.VEHITRACK_CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "...",
  WOMPI_PUBLIC_KEY: "pub_test_...",
  WOMPI_API_URL: "https://sandbox.wompi.co/v1",
};
```

## 6. Desplegar el frontend en Render

**New + → Static Site** → conecta el repo. Build Command vacío, Publish
Directory `.`

## 7. Probar el flujo completo

1. Regístrate/inicia sesión (revisa que "Confirm email" esté como lo
   quieras en Authentication → Settings).
2. Dale "Recargar", elige un monto, paga con una
   [tarjeta de prueba](https://docs.wompi.co/docs/colombia/tarjetas-de-prueba/) en sandbox.
3. Al volver, el saldo debería actualizarse en unos segundos (lo
   acredita el webhook).
4. Escribe una placa y el documento del propietario, y consulta — el
   informe combinado aparece al instante, el saldo baja $20.000, la
   consulta queda guardada en tu historial, y te debería llegar una
   copia por correo en unos segundos (revisa spam la primera vez).
5. Desde el informe puedes descargarlo como PDF (botón "Descargar
   PDF", usa la función de imprimir del navegador) o compartirlo por
   WhatsApp (abre WhatsApp con un resumen del informe).
6. Para probar "sin saldo": si el saldo es menor al costo, la página
   abre el modal de recarga automáticamente.

## Cómo funciona

1. **Recargar**: `recarga-firma` crea la solicitud y firma el checkout
   de Wompi. Al pagar, `wompi-webhook` confirma y abona el saldo
   (`sumar_creditos`).
2. **Consultar**: `consulta` descuenta $20.000 del saldo al instante
   (`consumir_credito`, atómico — si no hay saldo, no cobra), y llama
   EN PARALELO a InfoSiniestral y a PlacApi. Si una de las dos falla,
   el informe sale con esa parte vacía y la otra completa; si fallan
   las dos, se reintegra el saldo y no se cobra. El resultado se
   guarda en `consultas` (historial de la cuenta) y se envía una
   copia por correo con Resend — si el correo falla, no se revierte
   el cobro, porque la consulta ya se prestó.

## Resumen de qué corre dónde

| Pieza | Dónde |
|---|---|
| `index.html`, `config.js`, `logo.png` | Render (Static Site) |
| `supabase/functions/wompi-webhook` | Supabase Edge Functions |
| `supabase/functions/recarga-firma` | Supabase Edge Functions |
| `supabase/functions/consulta` | Supabase Edge Functions |
| `supabase/functions/_shared/infosiniestral.ts` | Módulo compartido (no se despliega solo) |
| `supabase/functions/_shared/placapi.ts` | Módulo compartido (no se despliega solo) |
| `supabase/functions/_shared/email-informe.ts` | Módulo compartido (no se despliega solo) |
| `verifica-backend.sql`, `verifica-wallet-recarga.sql` | Supabase Postgres (SQL Editor) |

## Seguridad (hecho y pendiente de tu lado)

Ya aplicado en el código: datos externos escapados (anti-XSS) en la
página y en el correo, CORS limitado a `vehitrack.app`, validación de
placa/documento, máx. 5 consultas por minuto por usuario, errores sin
detalles internos, comparación segura de la firma del webhook,
contraseña mínima de 8 con letras y números, versiones de librerías
fijadas y política CSP en las páginas.

Pasos manuales:
1. **Supabase → Authentication → Providers → Email**: sube
   "Minimum password length" a 8 y activa "Confirm email".
2. **Render → tu Static Site → Settings → Headers**: agrega
   `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin` y
   `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   (render.yaml solo aplica si usas Blueprint).
3. Si pruebas desde otra URL (ej. `*.onrender.com`), agrega ese origen:
   `supabase secrets set ALLOWED_ORIGINS="https://vehitrack.app,https://www.vehitrack.app,https://TU-APP.onrender.com"`
4. Redespliega las 3 funciones (`consulta`, `recarga-firma`,
   `wompi-webhook --no-verify-jwt`).

---

## Panel de superadmin (`/admin.html`)

Permite revisar usuarios, consultas, pagos y detectar problemas (recargas atascadas, proveedores caídos, informes incompletos, saldos negativos, webhooks con firma inválida).

**Pasos (una sola vez):**
1. En Supabase → SQL Editor, pega y ejecuta el contenido de `verifica-admin.sql` (crea las tablas `admins` y `eventos`).
2. Los superadministradores (`renzogallo@hotmail.com` y `autofirm_baq@hotmail.com`) ya quedan en `verifica-admin.sql`. Ambos deben haberse registrado antes en el sitio con ese correo; si alguno no existe todavía, vuelve a correr el `insert` de ese archivo después de que se registre. Para comprobar:
   ```sql
   select u.email from public.admins a join auth.users u on u.id = a.user_id;
   ```
3. Despliega la función nueva y vuelve a desplegar las tres existentes (ahora registran eventos):
   ```
   supabase functions deploy admin --no-verify-jwt
   supabase functions deploy consulta --no-verify-jwt
   supabase functions deploy recarga-firma --no-verify-jwt
   supabase functions deploy wompi-webhook --no-verify-jwt
   ```
4. Sube `admin.html` a GitHub junto con el resto. Entra a `https://vehitrack.app/admin.html` con tu correo y contraseña.

**Seguridad:** el acceso lo decide el servidor (tabla `admins`), no el hecho de que la URL sea secreta. Quien no esté en `admins` recibe "Acceso denegado". Las acciones "Acreditar" y "Aprobar recarga" quedan registradas en `eventos`. Antes de aprobar una recarga a mano, confirma en el panel de Wompi que el pago está APROBADO.

**Limpieza opcional:** `verifica-admin.sql` trae (comentado) un borrado de eventos de más de 90 días.

### Cerrar las funciones de saldo al público (importante)
Ejecuta una vez `verifica-seguridad-rpc.sql` en el SQL Editor. Quita el permiso de `anon` y `authenticated` sobre `consumir_credito`, `reintegrar_credito`, `sumar_creditos` y `crear_wallet`; las Edge Functions siguen funcionando porque usan `service_role`.

### Botón "Mis consultas"
No requiere cambios en las funciones. La política `consultas propias` (solo lectura de las filas del propio usuario) ya existe en tu base; `verifica-mis-consultas.sql` solo agrega un índice. El botón aparece en el encabezado al iniciar sesión.

### Permiso para abonar saldo
Cada admin tiene `puede_abonar` en la tabla `admins` (por defecto **falso**). Sin él puede ver todo el panel y aprobar recargas pendientes, pero el botón "Acreditar" queda oculto y el servidor rechaza esa acción. Para darlo o quitarlo:
```sql
update public.admins a set puede_abonar = true  -- o false
  from auth.users u where u.id = a.user_id and lower(u.email) = 'correo@ejemplo.com';
```
