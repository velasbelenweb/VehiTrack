# Guía de despliegue — VehiTrack

VehiTrack usa un **saldo recargable** (wallet en pesos, sin "créditos"
abstractos): recargas con Wompi, y cada consulta descuenta su costo
directo — Básico $5.000 · Avanzado $10.000 — al instante, sin redirigir
a Wompi en cada consulta.

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
4. Elige Básico o Avanzado y consulta una placa — el informe aparece
   al instante y el saldo baja $5.000 o $10.000.
5. Para probar "sin saldo": si el saldo es menor al costo, la página
   abre el modal de recarga automáticamente.

## Cómo funciona

1. **Recargar**: `recarga-firma` crea la solicitud y firma el checkout
   de Wompi. Al pagar, `wompi-webhook` confirma y abona el saldo
   (`sumar_creditos`).
2. **Consultar**: `consulta` descuenta el costo del saldo al instante
   (`consumir_credito`, atómico — si no hay saldo, no cobra), llama a
   PlacApi, y si PlacApi falla, reintegra el saldo (`reintegrar_credito`).

## Resumen de qué corre dónde

| Pieza | Dónde |
|---|---|
| `index.html`, `config.js`, `logo.png` | Render (Static Site) |
| `supabase/functions/wompi-webhook` | Supabase Edge Functions |
| `supabase/functions/recarga-firma` | Supabase Edge Functions |
| `supabase/functions/consulta` | Supabase Edge Functions |
| `supabase/functions/_shared/placapi.ts` | Módulo compartido (no se despliega solo) |
| `verifica-backend.sql`, `verifica-wallet-recarga.sql` | Supabase Postgres (SQL Editor) |
