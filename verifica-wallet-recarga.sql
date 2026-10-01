-- ================================================================
--  VEHITRACK · WALLET RECARGABLE (saldo en pesos)
--  Ejecutar después de verifica-backend.sql. Seguro de volver a
--  correr aunque ya tengas parte de esto de una versión anterior.
--
--  El saldo del wallet (tabla wallets, columna creditos, ya creada
--  en verifica-backend.sql) ahora se maneja en PESOS directos, no en
--  "créditos" abstractos: cada consulta descuenta $5.000 (Básico) o
--  $10.000 (Avanzado) tal cual.
-- ================================================================

create table if not exists public.recargas (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  reference   text unique not null,          -- referencia enviada a Wompi
  monto_cents integer not null,
  estado      text not null default 'pendiente'
                check (estado in ('pendiente','aprobada','rechazada')),
  wompi_txn_id text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists recargas_user_fecha on public.recargas (user_id, created_at desc);

alter table public.recargas enable row level security;
drop policy if exists "recargas propias" on public.recargas;
create policy "recargas propias" on public.recargas
  for select to authenticated using (user_id = auth.uid());
-- INSERT/UPDATE los hace la Edge Function con service_role.

-- Abona pesos al wallet (lo usa el webhook al aprobarse una recarga).
create or replace function public.sumar_creditos(p_user uuid, p_creditos int)
returns int language plpgsql security definer set search_path = public as $$
declare restante int;
begin
  insert into public.wallets (user_id, creditos) values (p_user, p_creditos)
  on conflict (user_id) do update set creditos = wallets.creditos + p_creditos, updated_at = now()
  returning creditos into restante;
  return restante;
end $$;
