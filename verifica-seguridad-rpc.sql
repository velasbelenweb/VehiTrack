-- ================================================================
--  VEHITRACK · cerrar las funciones del saldo al público
--  Las funciones de saldo (SECURITY DEFINER) solo las deben usar las
--  Edge Functions con la llave service_role. Sin esto, cualquiera con
--  la llave pública podía llamar /rest/v1/rpc/sumar_creditos y
--  regalarse saldo. (Ya aplicado en el proyecto ncousntgxauqgfoqsaxh.)
-- ================================================================
revoke execute on function public.consumir_credito(uuid, integer) from public, anon, authenticated;
revoke execute on function public.reintegrar_credito(uuid, integer) from public, anon, authenticated;
revoke execute on function public.sumar_creditos(uuid, integer) from public, anon, authenticated;
revoke execute on function public.crear_wallet() from public, anon, authenticated;
grant execute on function public.consumir_credito(uuid, integer) to service_role;
grant execute on function public.reintegrar_credito(uuid, integer) to service_role;
grant execute on function public.sumar_creditos(uuid, integer) to service_role;
