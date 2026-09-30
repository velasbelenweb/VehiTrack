-- ================================================================
--  VEHITRACK · CONSULTAS DE PAGO DIRECTO (sin wallet de créditos)
--  Ejecutar después de verifica-backend.sql, verifica-pagos.sql y
--  verifica-suscripciones.sql.
--
--  Cada consulta que NO la cubre una suscripción activa se paga
--  directo con Wompi: Básico $5.000, Avanzado $10.000. Esta tabla
--  guarda la solicitud mientras el usuario paga en el checkout de
--  Wompi; cuando el webhook confirma el pago, se consulta PlacApi
--  y el resultado queda listo para que el frontend lo recoja.
-- ================================================================

create table if not exists public.consultas_pendientes (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  reference       text unique not null,        -- CONS-{timestamp}-{random}
  placa           text not null,
  doc_type        text,
  doc_number      text,
  primer_apellido text,
  ciudad          text,
  tipo            text not null check (tipo in ('basico','avanzado')),
  amount_cents    integer not null,
  estado          text not null default 'pendiente'
                    check (estado in ('pendiente','pagado','listo','rechazado')),
  informe_id      bigint references public.consultas(id),
  wompi_txn_id    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists consultas_pendientes_user on public.consultas_pendientes (user_id, created_at desc);

alter table public.consultas_pendientes enable row level security;

drop policy if exists "consultas pendientes propias" on public.consultas_pendientes;
create policy "consultas pendientes propias" on public.consultas_pendientes
  for select to authenticated using (user_id = auth.uid());
-- INSERT/UPDATE los hacen las Edge Functions con service_role.
