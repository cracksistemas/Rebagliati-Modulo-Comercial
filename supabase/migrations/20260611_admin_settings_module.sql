alter table public.profiles
add column if not exists email text,
add column if not exists area text default 'Comercial',
add column if not exists profile_status text not null default 'Activo'
  check (profile_status in ('Activo','Inactivo','Pendiente de invitacion','Bloqueado','Archivado')),
add column if not exists phone text,
add column if not exists job_title text,
add column if not exists location text,
add column if not exists internal_notes text,
add column if not exists last_access_at timestamptz,
add column if not exists blocked_at timestamptz,
add column if not exists archived_at timestamptz;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  full_name text generated always as (trim(first_name || ' ' || last_name)) stored,
  email text not null unique,
  area text not null,
  role text not null,
  status text not null default 'Pendiente de invitacion'
    check (status in ('Activo','Inactivo','Pendiente de invitacion','Bloqueado','Archivado')),
  phone text,
  job_title text,
  location text,
  internal_notes text,
  last_access_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  access_level integer not null default 10,
  status text not null default 'Activo' check (status in ('Activo','Inactivo','Sistema','Personalizado')),
  system_role boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_code text not null references public.admin_roles(code) on delete cascade,
  module text not null,
  action text not null,
  allowed boolean not null default false,
  scope text not null default 'No permitir',
  created_at timestamptz not null default now(),
  unique (role_code, module, action)
);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  device text,
  browser text,
  ip_address text,
  location text,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz,
  status text not null default 'Activa' check (status in ('Activa','Cerrada','Expirada','Bloqueada')),
  closed_by uuid references public.profiles(id),
  closed_at timestamptz
);

alter table public.audit_logs
add column if not exists module text,
add column if not exists action_type text,
add column if not exists result text default 'Exitoso',
add column if not exists ip_address text,
add column if not exists device text,
add column if not exists browser text,
add column if not exists criticality text default 'Media',
add column if not exists metadata jsonb default '{}'::jsonb;

insert into public.admin_roles (code, name, description, access_level, status, system_role)
values
  ('admin_sistema', 'Superadministrador', 'Control total de usuarios, roles, auditoria y seguridad.', 100, 'Sistema', true),
  ('gerencia', 'Administrador', 'Gestion comercial completa y auditoria gerencial.', 80, 'Sistema', true),
  ('jefe_ventas', 'Ventas', 'Gestion de equipos, validacion comercial y metas.', 60, 'Sistema', true),
  ('lider_ventas', 'Jefe de area', 'Seguimiento y validacion del equipo asignado.', 45, 'Sistema', true),
  ('ejecutivo', 'Usuario operativo', 'Registro de ventas propias y seguimiento personal.', 20, 'Sistema', true),
  ('marketing_soporte', 'Solo lectura', 'Lectura de dashboard y reportes operativos.', 15, 'Sistema', true)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    access_level = excluded.access_level,
    status = excluded.status,
    system_role = excluded.system_role;

create or replace function public.log_admin_event(
  p_module text,
  p_action_type text,
  p_record_id uuid,
  p_old_data jsonb default null,
  p_new_data jsonb default null,
  p_result text default 'Exitoso',
  p_criticality text default 'Media',
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id,
    module,
    action_type,
    result,
    criticality,
    metadata
  )
  values (
    coalesce(p_module, 'Configuracion'),
    p_record_id,
    coalesce(p_action_type, 'Accion administrativa'),
    p_old_data,
    p_new_data,
    auth.uid(),
    p_module,
    p_action_type,
    p_result,
    p_criticality,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.log_admin_event(text,text,uuid,jsonb,jsonb,text,text,jsonb) to authenticated;

create or replace function public.assign_executive_team(p_executive_id uuid, p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := current_date;
begin
  if not public.is_role(array['jefe_ventas','admin_sistema','gerencia']) then
    raise exception 'No tienes permisos para reasignar equipos.';
  end if;

  update public.team_members
  set active = false,
      end_date = today
  where executive_id = p_executive_id
    and active = true;

  if p_team_id is not null then
    insert into public.team_members (team_id, executive_id, start_date, end_date, active)
    values (p_team_id, p_executive_id, today, null, true)
    on conflict (team_id, executive_id, start_date) do update
      set active = true,
          end_date = null;
  end if;

  perform public.log_admin_event(
    'Ejecutivos',
    'Reasigno equipo',
    p_executive_id,
    null,
    jsonb_build_object('team_id', p_team_id),
    'Exitoso',
    'Alta',
    '{}'::jsonb
  );
end;
$$;

grant execute on function public.assign_executive_team(uuid,uuid) to authenticated;

create or replace trigger admin_users_touch_updated_at
before update on public.admin_users
for each row execute function public.touch_updated_at();

create or replace trigger admin_roles_touch_updated_at
before update on public.admin_roles
for each row execute function public.touch_updated_at();

alter table public.admin_users enable row level security;
alter table public.admin_roles enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_sessions enable row level security;

drop policy if exists "admin users managers read" on public.admin_users;
create policy "admin users managers read"
on public.admin_users for select
to authenticated
using (public.is_role(array['admin_sistema','gerencia','jefe_ventas']));

drop policy if exists "admin users admins manage" on public.admin_users;
create policy "admin users admins manage"
on public.admin_users for all
to authenticated
using (public.is_role(array['admin_sistema','gerencia']))
with check (public.is_role(array['admin_sistema','gerencia']));

drop policy if exists "admin roles managers read" on public.admin_roles;
create policy "admin roles managers read"
on public.admin_roles for select
to authenticated
using (public.is_role(array['admin_sistema','gerencia','jefe_ventas']));

drop policy if exists "admin roles admins manage" on public.admin_roles;
create policy "admin roles admins manage"
on public.admin_roles for all
to authenticated
using (public.is_role(array['admin_sistema','gerencia']))
with check (public.is_role(array['admin_sistema','gerencia']));

drop policy if exists "admin permissions managers read" on public.admin_role_permissions;
create policy "admin permissions managers read"
on public.admin_role_permissions for select
to authenticated
using (public.is_role(array['admin_sistema','gerencia','jefe_ventas']));

drop policy if exists "admin permissions admins manage" on public.admin_role_permissions;
create policy "admin permissions admins manage"
on public.admin_role_permissions for all
to authenticated
using (public.is_role(array['admin_sistema','gerencia']))
with check (public.is_role(array['admin_sistema','gerencia']));

drop policy if exists "admin sessions managers read" on public.admin_sessions;
create policy "admin sessions managers read"
on public.admin_sessions for select
to authenticated
using (public.is_role(array['admin_sistema','gerencia']));

drop policy if exists "admin sessions admins update" on public.admin_sessions;
create policy "admin sessions admins update"
on public.admin_sessions for update
to authenticated
using (public.is_role(array['admin_sistema','gerencia']))
with check (public.is_role(array['admin_sistema','gerencia']));
