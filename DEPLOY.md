# Guía de despliegue — VehiTrack

Como no tienes aún un proyecto de Supabase, sigue este orden exacto:
Supabase primero (backend + base de datos), luego Render (frontend).

## 1. Crear el proyecto de Supabase

1. Ve a https://supabase.com/dashboard → **New project**.
2. Guarda la **contraseña de la base de datos** que definas ahí, la necesitarás para el CLI.
3. Cuando esté listo, entra a **Project Settings → API** y copia:
   - `Project URL` → lo usarás como `SUPABASE_URL`
   - `anon public` key → lo usarás como `SUPABASE_ANON_KEY`
   - `service_role` key → **secreta**, solo para las Edge Functions, nunca al frontend

## 2. Crear las tablas (SQL Editor)

En el dashboard de Supabase, abre **SQL Editor → New query** y ejecuta los 3 archivos **en este orden exacto** (cada uno depende del anterior):

1. `verifica-backend.sql`
2. `verifica-pagos.sql`
3. `verifica-suscripciones.sql`

Pega el contenido completo de cada archivo y dale **Run** antes de pasar al siguiente.

## 3. Crear tu cuenta/comercio en Bold

1. Regístrate en https://bold.co y activa tu comercio.
2. En el panel, busca la sección de **Integraciones → Botón de pagos**. Ahí encontrarás:
   - La **llave de identidad** (pública) → la usarás como `BOLD_API_KEY`
   - La **llave secreta** → la usarás como `BOLD_SECRET_KEY` (nunca va al frontend)
3. Si tu cuenta permite modo de pruebas, úsalo primero antes de pasar a llaves de producción.

⚠️ **No verificado**: no tengo acceso confirmado a la documentación más reciente de Bold. Antes de ir a producción, confirma en su panel/soporte:
- El nombre exacto de estos campos (puede variar).
- La fórmula exacta de la firma de integridad del botón de pagos (la que implementé es `sha256hex(orderId + amount + currency + secretKey)`, el formato más comúnmente documentado, pero contrástalo con tu panel).
- Si Bold firma sus webhooks (para poder validarlos en `bold-webhook`) y con qué mecanismo.
- Su mecanismo real de **cobro recurrente/autodebit** para las suscripciones — la función `suscribir` incluida aquí solo resuelve el primer cobro vía botón de pagos; ver el aviso dentro de ese archivo.

## 4. Desplegar las Edge Functions

Necesitas el [CLI de Supabase](https://supabase.com/docs/guides/cli) instalado localmente (no corre en Render):

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU-PROJECT-REF   # lo ves en la URL del dashboard
```

Configura los secretos (nunca los subas al repo):

```bash
supabase secrets set BOLD_API_KEY=tu_llave_de_identidad_bold
supabase secrets set BOLD_SECRET_KEY=tu_llave_secreta_bold
supabase secrets set BOLD_WEBHOOK_SECRET=tu_secreto_de_webhook_si_bold_lo_ofrece
supabase secrets set PLACAPI_BASE_URL=https://api.placapi.com/v1
supabase secrets set PLACAPI_API_KEY=tu_llave_privada_de_placapi
```

Despliega las cuatro funciones:

```bash
supabase functions deploy bold-webhook --no-verify-jwt
supabase functions deploy recarga-firma
supabase functions deploy suscribir
supabase functions deploy consulta
```

En el panel de Bold, configura la URL del webhook apuntando a:
`https://TU-PROYECTO.supabase.co/functions/v1/bold-webhook`

Dispara un pago de prueba y revisa los logs (`supabase functions logs bold-webhook`) para confirmar la forma real del payload — luego ajusta `leerEvento()` en ese archivo si los nombres de campo no coinciden con lo que asumí.

⚠️ **Antes de ir a producción con `consulta`**: revisa `consultarPlacApi` dentro de `supabase/functions/consulta/index.ts`; no tengo acceso a la documentación real de PlacApi, así que el endpoint y el mapeo de la respuesta son una plantilla, no algo verificado.

## 5. Completar config.js

Abre `config.js` (ya generado en la raíz del repo) y reemplaza los 3 valores:

```js
window.VEHITRACK_CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "...",
  BOLD_API_KEY: "...",   // llave de IDENTIDAD (pública) de Bold
};
```

Este archivo sí va en el repo/hosting (son llaves públicas), pero **nunca** pongas ahí la llave secreta de Bold ni la de PlacApi.

## 6. Desplegar el frontend en Render

Opción rápida (Blueprint, usa el `render.yaml` ya incluido):

1. Sube estos cambios (index.html, config.js, logo.png, render.yaml, supabase/functions) a tu repo de GitHub.
2. En Render: **New + → Blueprint** → conecta el repo `Surfnpunk86/VehiTrack`.
3. Render detecta `render.yaml` y crea un **Static Site** automáticamente.
4. Espera el deploy; la URL pública quedará como `https://vehitrack.onrender.com`.

Opción manual (sin Blueprint):

1. **New + → Static Site** → conecta el repo.
2. Build command: (vacío)
3. Publish directory: `.` (raíz del repo)
4. Deploy.

## 7. Probar

1. Abre la URL de Render. Si `config.js` está bien, debe desaparecer el modo demo.
2. Regístrate/inicia sesión (usa Supabase Auth, revisa que esté habilitado en el dashboard).
3. Verifica que tu wallet tenga créditos: en SQL Editor de Supabase,
   ```sql
   update public.wallets set creditos = creditos + 10
   where user_id = (select id from auth.users where email = 'tucorreo@ejemplo.com');
   ```
4. Haz una consulta de placa y confirma que descuenta el crédito y trae el informe.
5. Haz una recarga de prueba (modo test de Bold si está disponible) y confirma que el webhook acredita el saldo.

## Resumen de qué corre dónde

| Pieza | Dónde |
|---|---|
| `index.html`, `config.js`, `logo.png` | Render (Static Site) |
| `supabase/functions/bold-webhook` | Supabase Edge Functions |
| `supabase/functions/recarga-firma` | Supabase Edge Functions |
| `supabase/functions/suscribir` | Supabase Edge Functions |
| `supabase/functions/consulta` | Supabase Edge Functions |
| `verifica-*.sql` | Supabase Postgres (SQL Editor) |
