/* ================================================================
   VEHITRACK · config.js
   ----------------------------------------------------------------
   Este archivo NO debe llevar llaves secretas. Solo va la URL de
   tu proyecto de Supabase, la llave ANON (pública, protegida por
   RLS) y la llave PÚBLICA de Wompi (también diseñada para exponerse
   en el navegador). Las llaves secretas (service_role, Wompi Events
   Secret, Wompi Private Key) van SOLO como variables de entorno de
   las Edge Functions en Supabase — nunca aquí ni en ningún archivo
   que subas a Git/Render.

   Reemplaza los 4 valores de abajo y sube este archivo junto al
   HTML (mismo folder) al hosting estático (Render Static Site).
   ================================================================ */
window.VEHITRACK_CONFIG = {
  // Panel de Supabase → Project Settings → API → Project URL
  SUPABASE_URL: "https://xxkcxktvzpyrrgsrubjq.supabase.co",

  // Panel de Supabase → Project Settings → API → anon public key
  SUPABASE_ANON_KEY: "sb_publishable_Vet3d8U4YcToSHhXeEuRjA_LQYxU5_3",

  // Panel de Wompi → Configuración → Llaves → Llave pública
  // Usa pub_test_... en sandbox y pub_prod_... en producción.
  WOMPI_PUBLIC_KEY: "pub_prod_PTEmMk27pwBZLnlKJveokxlc67CUVoKY",

  // Sandbox: https://sandbox.wompi.co/v1  |  Producción: https://production.wompi.co/v1
  WOMPI_API_URL: "https://sandbox.wompi.co/v1"
};
