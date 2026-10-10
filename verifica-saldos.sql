-- Saldos de los proveedores (pestaña "Saldos" del superadmin).
-- Ya fue aplicado en tu proyecto de Supabase; se deja aquí por si lo necesitas de nuevo.
create table if not exists public.proveedor_saldos (
  proveedor text primary key check (proveedor in ('infosiniestral','placapi')),
  saldo numeric not null,
  costo_consulta numeric not null default 1 check (costo_consulta > 0),
  origen text not null default 'manual' check (origen in ('api','manual')),
  actualizado_at timestamptz not null default now()
);
alter table public.proveedor_saldos enable row level security;
revoke all on public.proveedor_saldos from anon, authenticated;
