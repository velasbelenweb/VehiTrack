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
  SUPABASE_URL: "https://xxkcxktvzpyrrgsrubjq.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a2N4a3R2enB5cnJnc3J1YmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NzU4NzksImV4cCI6MjEwNTM1MTg3OX0.LWZw0hrDLQuUIEVZbzbm7niyVliOIy_rwgDrbLG_SwQ",

  // Panel de Wompi → Configuración → Llaves → Llave pública
  // Usa pub_test_... en sandbox y pub_prod_... en producción.
  WOMPI_PUBLIC_KEY: "pub_test_TU-LLAVE-PUBLICA",

  // Sandbox: https://sandbox.wompi.co/v1  |  Producción: https://production.wompi.co/v1
  WOMPI_API_URL: "https://sandbox.wompi.co/v1"
};
