create table if not exists public.role_greetings (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  message text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.role_greetings enable row level security;

drop policy if exists "Authenticated users can read active greetings" on public.role_greetings;
create policy "Authenticated users can read active greetings"
on public.role_greetings
for select
to authenticated
using (active = true);

create index if not exists role_greetings_role_idx on public.role_greetings(role) where active = true;

alter table public.executives
  add column if not exists goal_amount numeric not null default 0,
  add column if not exists current_sales numeric not null default 0,
  add column if not exists points numeric not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'executives_profile_id_key'
  ) then
    alter table public.executives add constraint executives_profile_id_key unique(profile_id);
  end if;
end $$;

insert into public.role_greetings(role, message)
values
  ('Ejecutivo', 'Buen dia. Revisa tus avances, prioriza tus leads calientes y registra cada venta con evidencia.'),
  ('Ejecutivo', 'Hoy tienes una nueva oportunidad para mejorar tu ranking. Empieza por tus seguimientos pendientes.'),
  ('Lider de ventas', 'Buen dia. Revisa el avance de tu equipo, valida ventas pendientes y acompana a quien tenga mayor brecha.'),
  ('Jefe de ventas', 'Buen dia. Tienes el tablero listo para validar, comparar equipos y mover la meta mensual.'),
  ('Gerencia', 'Buen dia. El resumen ejecutivo esta listo para revisar avance, brechas y contribucion por equipo.'),
  ('Superadministrador', 'Buen dia. Puedes revisar usuarios, permisos, auditoria e integraciones desde Configuracion.'),
  ('Administrador', 'Buen dia. Revisa accesos, roles y operaciones sensibles antes de cerrar el dia.'),
  ('Marketing', 'Buen dia. Revisa el Mapa de Clientes y cruza insights con origen de leads y campanas.'),
  ('Solo lectura', 'Buen dia. Tienes acceso de consulta a los indicadores comerciales principales.')
on conflict do nothing;
