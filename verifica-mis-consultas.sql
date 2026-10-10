-- ================================================================
--  VEHITRACK · "Mis consultas"
--  El proyecto ya tiene la política "consultas propias" (SELECT,
--  user_id = auth.uid()), que es la que deja a cada usuario leer solo
--  lo suyo. Solo se agrega un índice para que la lista cargue rápido.
-- ================================================================
create index if not exists consultas_user_created_idx on public.consultas (user_id, created_at desc);
