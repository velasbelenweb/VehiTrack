# Guía de despliegue — VehiTrack

VehiTrack cobra **por consulta**, directo con Wompi — no hay wallet de
créditos ni planes de suscripción. Básico $5.000 · Avanzado $10.000.

## 1. Crear el proyecto de Supabase

1. Ve a https://supabase.com/dashboard → **New project**.
2. Guarda la **contraseña de la base de datos**, la necesitarás para el CLI.
3. En **Project Settings → API** copia:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → **secreta**, solo para las Edge Functions

## 2. Crear las tablas (SQL Editor)

Ejecuta, en este orden, en **SQL Editor → New query**:

1. `verifica-backend.sql` (usuarios, tabla `consultas`, RLS)
2. `verifica-consultas-pago.sql` (tabla `consultas_pendientes` para el pago por consulta)

> `verifica-pagos.sql` y `verifica-suscripciones.sql` quedaron **obsoletos**
> (eran del viejo sistema de wallet/planes) — no hace falta correrlos en
> una instalación nueva. Si ya los habías corrido antes, no pasa nada por
> dejar esas tablas sin usar.

## 3. Configurar tu comercio en Wompi

1. Regístrate en https://comercios.wompi.co (o el sandbox: https://comercios.wompi.co/sandbox).
2. En **Configuración → Llaves** copia:
   - **Llave pública** (`pub_test_...` / `pub_prod_...`) → va en `config.js`.
   - **Llave secreta de integridad** → secreta, firma el checkout.
   - **Events secret** → secreta, valida los webhooks.

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
supabase secrets set PLACAPI_API_KEY=tu_llave_de_placapi
```

Desplegar (son solo 3 funciones):

```bash
supabase functions deploy wompi-webhook --no-verify-jwt
supabase functions deploy consulta-firma
supabase functions deploy informe-estado
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

1. Regístrate/inicia sesión.
2. Elige Básico o Avanzado, llena el formulario y da clic en "Consultar historial".
3. Te redirige al checkout de Wompi — paga con una [tarjeta de prueba](https://docs.wompi.co/docs/colombia/tarjetas-de-prueba/) en sandbox.
4. Al volver, la página espera unos segundos (el webhook confirma el pago y arma el informe) y muestra el resultado.

## Cómo funciona el pago por consulta

1. El usuario elige Básico/Avanzado y llena el formulario.
2. `consulta-firma` guarda la solicitud en `consultas_pendientes` y devuelve
   la firma para el checkout de Wompi.
3. El navegador redirige a Wompi; el usuario paga.
4. Wompi notifica a `wompi-webhook`, que llama a PlacApi, guarda el informe
   en `consultas`, y marca la solicitud como `listo`.
5. Al volver a la página, `informe-estado` se consulta cada pocos segundos
   hasta que el informe esté listo, y se muestra.

## Resumen de qué corre dónde

| Pieza | Dónde |
|---|---|
| `index.html`, `config.js`, `logo.png` | Render (Static Site) |
| `supabase/functions/wompi-webhook` | Supabase Edge Functions |
| `supabase/functions/consulta-firma` | Supabase Edge Functions |
| `supabase/functions/informe-estado` | Supabase Edge Functions |
| `supabase/functions/_shared/placapi.ts` | Módulo compartido (no se despliega solo) |
| `verifica-backend.sql`, `verifica-consultas-pago.sql` | Supabase Postgres (SQL Editor) |
