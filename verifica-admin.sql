-- ================================================================
--  VEHITRACK · PANEL SUPERADMIN (tablas de apoyo)
--  Ejecutar en Supabase → SQL Editor → New query → Run.
--  Seguro de volver a correr.
--
--  Ninguna de las dos tablas tiene políticas de lectura: el navegador
--  NO puede leerlas. Solo las Edge Functions (llave service_role) las
--  usan, y la función "admin" verifica en el servidor que quien llama
--  esté en la tabla `admins`.
-- ================================================================

-- Quién es superadmin
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

-- Registro de eventos para detectar problemas (pagos, proveedores, correo…)
create table if not exists public.eventos (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  nivel      text not null check (nivel in ('info','warn','error')),
  tipo       text not null,
  user_id    uuid,
  detalle    jsonb
);
create index if not exists eventos_fecha on public.eventos (created_at desc);
create index if not exists eventos_nivel_fecha on public.eventos (nivel, created_at desc);
alter table public.eventos enable row level security;

-- ----------------------------------------------------------------
--  SUPERADMINISTRADORES
--  Ambas personas deben haberse registrado antes en vehitrack.app con
--  ese mismo correo; si alguno aún no existe, no se inserta y hay que
--  volver a correr esta sentencia después de que se registre.
-- ----------------------------------------------------------------
insert into public.admins (user_id)
  select id from auth.users
  where lower(email) in ('renzogallo@hotmail.com', 'autofirm_baq@hotmail.com')
  on conflict do nothing;

-- Permiso para abonar saldo / aprobar recargas a mano (por defecto NO).
-- Un admin sin este permiso puede ver todo, pero no mover dinero.
alter table public.admins add column if not exists puede_abonar boolean not null default false;
update public.admins a set puede_abonar = true
  from auth.users u where u.id = a.user_id and lower(u.email) = 'renzogallo@hotmail.com';
update public.admins a set puede_abonar = false
  from auth.users u where u.id = a.user_id and lower(u.email) = 'autofirm_baq@hotmail.com';

-- Verificar (deben salir 2 filas):
-- select u.email, a.puede_abonar from public.admins a join auth.users u on u.id = a.user_id;

-- Opcional: borrar eventos de más de 90 días
-- delete from public.eventos where created_at < now() - interval '90 days';
