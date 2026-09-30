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
   ================================================================ */
window.VEHITRACK_CONFIG = {
  SUPABASE_URL: "https://ncousntgxauqgfoqsaxh.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jb3VzbnRneGF1cWdmb3FzYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Njk0NTksImV4cCI6MjEwNjM0NTQ1OX0.nCY2dHyTNYzEFfz_ZcUS1OlXU8QEgrBwFSHNdS2pJCg",

  // Panel de Wompi → Configuración → Llaves → Llave pública
  // Usa pub_test_... en sandbox y pub_prod_... en producción.
  WOMPI_PUBLIC_KEY: "pub_prod_PTEmMk27pwBZLnlKJveokxlc67CUVoKY",

  // Sandbox: https://sandbox.wompi.co/v1  |  Producción: https://production.wompi.co/v1
  WOMPI_API_URL: "https://xxkcxktvzpyrrgsrubjq.supabase.co/functions/v1/wompi-webhook"
};
