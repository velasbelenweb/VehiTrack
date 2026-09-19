/* ================================================================
   VEHITRACK · config.js
   ----------------------------------------------------------------
   Este archivo NO debe llevar llaves secretas. Solo va la URL de
   tu proyecto de Supabase, la llave ANON (pública, protegida por
   RLS) y la llave de IDENTIDAD (pública) de Bold. Las llaves
   secretas (service_role, llave SECRETA de Bold, API key de
   PlacApi) van SOLO como variables de entorno de las Edge Functions
   en Supabase — nunca aquí ni en ningún archivo que subas a Git/Render.

   Reemplaza los 3 valores de abajo y sube este archivo junto al
   HTML (mismo folder) al hosting estático (Render Static Site).
   ================================================================ */
window.VEHITRACK_CONFIG = {
  // Panel de Supabase → Project Settings → API → Project URL
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",

  // Panel de Supabase → Project Settings → API → anon public key
  SUPABASE_ANON_KEY: "TU-LLAVE-ANON-PUBLICA",

  // Panel de Bold → Tu comercio → Integraciones → Botón de pagos.
  // Esta es la LLAVE DE IDENTIDAD (pública). La llave SECRETA de
  // Bold nunca va aquí: solo en los secretos de las Edge Functions
  // (ver DEPLOY.md).
  // ⚠️ Confirma el nombre exacto de este campo en tu panel de Bold
  // antes de darlo por bueno — no tengo acceso verificado a su
  // documentación más reciente.
  BOLD_API_KEY: "TU-LLAVE-DE-IDENTIDAD-BOLD"
};
