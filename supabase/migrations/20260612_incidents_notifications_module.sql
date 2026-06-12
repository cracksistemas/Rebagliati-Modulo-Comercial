-- Incidencias, notificaciones y opciones comerciales dinamicas.

create table if not exists public.commercial_options (
  id text primary key,
  option_type text not null check (option_type in ('lead_source','payment_method')),
  label text not null,
  active boolean not null default true,
  created_by uuid null references public.profiles(id),
  created_at timestamptz not null default now()
);

create unique index if not exists commercial_options_type_label_idx
on public.commercial_options (option_type, lower(label));

create table if not exists public.commercial_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_code text not null unique,
  incident_date date not null,
  executive_id uuid null references public.executives(id),
  executive_name text not null,
  sales_leader_id uuid null references public.executives(id),
  sales_leader_name text not null,
  description text not null,
  severity text not null check (severity in ('Leve','Moderada','Grave','Critica')),
  category text not null,
  status text not null default 'Pendiente',
  solution_or_measure text,
  disciplinary_action_type text,
  points_deducted numeric not null default 0,
  client_name text,
  lead_id text,
  kommo_lead_id text,
  course_or_program text,
  channel text,
  evidence_url text,
  executive_response text,
  created_by uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid null references public.profiles(id),
  updated_at timestamptz,
  closed_by uuid null references public.profiles(id),
  closed_at timestamptz,
  is_recurrent boolean not null default false,
  recurrent_group_id uuid
);

create table if not exists public.commercial_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  audience text not null default 'Todos',
  notification_type text not null default 'Comunicado',
  active boolean not null default true,
  created_by uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  read_by text[] not null default '{}',
  request_status text null check (request_status in ('Pendiente','Autorizado','Rechazado')),
  authorized_by text,
  authorized_at timestamptz,
  related_sale_id uuid null
);

create table if not exists public.user_reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text not null,
  due_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  completed boolean not null default false
);

alter table public.commercial_options enable row level security;
alter table public.commercial_incidents enable row level security;
alter table public.commercial_notifications enable row level security;
alter table public.user_reminders enable row level security;

drop policy if exists "commercial options read authenticated" on public.commercial_options;
create policy "commercial options read authenticated" on public.commercial_options
for select to authenticated using (active = true or public.is_role(array['admin_sistema']));

drop policy if exists "commercial options insert authenticated" on public.commercial_options;
create policy "commercial options insert authenticated" on public.commercial_options
for insert to authenticated with check (auth.uid() is not null);

drop policy if exists "incidents read by role" on public.commercial_incidents;
create policy "incidents read by role" on public.commercial_incidents
for select to authenticated using (
  public.is_role(array['admin_sistema','gerencia','jefe_ventas','lider_ventas'])
  or exists (
    select 1 from public.executives e
    join public.profiles p on p.id = e.profile_id
    where p.id = auth.uid() and e.id = commercial_incidents.executive_id
  )
);

drop policy if exists "incidents manage by leaders" on public.commercial_incidents;
create policy "incidents manage by leaders" on public.commercial_incidents
for all to authenticated using (public.is_role(array['admin_sistema','gerencia','jefe_ventas','lider_ventas']))
with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas','lider_ventas']));

drop policy if exists "notifications read authenticated" on public.commercial_notifications;
create policy "notifications read authenticated" on public.commercial_notifications
for select to authenticated using (active = true);

drop policy if exists "notifications manage admin" on public.commercial_notifications;
create policy "notifications manage admin" on public.commercial_notifications
for all to authenticated using (public.is_role(array['admin_sistema','gerencia','jefe_ventas']))
with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas']));

drop policy if exists "reminders own" on public.user_reminders;
create policy "reminders own" on public.user_reminders
for all to authenticated using (created_by = auth.uid())
with check (created_by = auth.uid());

insert into public.commercial_options (id, option_type, label, active)
values
  ('lead-meta','lead_source','Meta Ads',true),
  ('lead-whatsapp','lead_source','WhatsApp',true),
  ('lead-base','lead_source','Base',true),
  ('lead-referido','lead_source','Referido',true),
  ('lead-organico','lead_source','Organico',true),
  ('lead-kommo','lead_source','Kommo',true),
  ('pay-transferencia','payment_method','Transferencia',true),
  ('pay-yape','payment_method','Yape',true),
  ('pay-tarjeta','payment_method','Tarjeta',true),
  ('pay-efectivo','payment_method','Efectivo',true),
  ('pay-plin','payment_method','Plin',true)
on conflict (id) do update set
  label = excluded.label,
  active = excluded.active;

insert into public.role_module_permissions (role, permission_id)
values
  ('Superadministrador','incidents.view'),
  ('Superadministrador','incidents.create'),
  ('Superadministrador','incidents.manage'),
  ('Superadministrador','incidents.export'),
  ('Superadministrador','incidents.criteria'),
  ('Superadministrador','notifications.view'),
  ('Superadministrador','notifications.manage'),
  ('Administrador','incidents.view'),
  ('Administrador','incidents.create'),
  ('Administrador','incidents.manage'),
  ('Administrador','incidents.export'),
  ('Administrador','incidents.criteria'),
  ('Administrador','notifications.view'),
  ('Administrador','notifications.manage'),
  ('Jefe de ventas','incidents.view'),
  ('Jefe de ventas','incidents.create'),
  ('Jefe de ventas','incidents.manage'),
  ('Jefe de ventas','incidents.export'),
  ('Jefe de ventas','notifications.view'),
  ('Jefe de ventas','notifications.manage'),
  ('Lider de ventas','incidents.view'),
  ('Lider de ventas','incidents.create'),
  ('Lider de ventas','notifications.view'),
  ('Ejecutivo','incidents.view'),
  ('Ejecutivo','notifications.view')
on conflict do nothing;
