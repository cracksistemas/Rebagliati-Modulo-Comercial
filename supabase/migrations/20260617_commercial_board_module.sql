create table if not exists public.commercial_board_assignments (
  id uuid primary key default gen_random_uuid(),
  board_date date not null,
  executive_id uuid references public.executives(id),
  team_id uuid references public.teams(id),
  product_edition_id text,
  product_name text not null,
  product_code text,
  product_type text not null,
  modality text,
  event_start_date date,
  lead_source text not null default 'Kommo',
  campaign text,
  priority text not null default 'Media' check (priority in ('Alta', 'Media', 'Baja')),
  priority_score numeric not null default 0,
  assigned_leads_count integer not null default 0 check (assigned_leads_count >= 0),
  leads_assigned_today integer not null default 0 check (leads_assigned_today >= 0),
  daily_call_goal integer not null default 70 check (daily_call_goal >= 0),
  calls_made integer not null default 0 check (calls_made >= 0),
  calls_answered integer not null default 0 check (calls_answered >= 0),
  messages_sent integer not null default 0 check (messages_sent >= 0),
  messages_received integer not null default 0 check (messages_received >= 0),
  contacts_made integer not null default 0 check (contacts_made >= 0),
  sales_count integer not null default 0 check (sales_count >= 0),
  sales_amount numeric not null default 0 check (sales_amount >= 0),
  status text not null default 'Sin iniciar',
  last_updated_at text,
  comments jsonb not null default '[]'::jsonb,
  kommo_url text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_commercial_board_assignments_date on public.commercial_board_assignments(board_date);
create index if not exists idx_commercial_board_assignments_executive on public.commercial_board_assignments(executive_id);
create index if not exists idx_commercial_board_assignments_team on public.commercial_board_assignments(team_id);

create table if not exists public.commercial_board_leads (
  id uuid primary key default gen_random_uuid(),
  lead_name text not null,
  phone text,
  source text not null default 'Kommo',
  campaign text,
  product_interest text not null default 'Por definir',
  created_at_label text,
  received_at timestamptz not null default now(),
  kommo_status text,
  score numeric not null default 0,
  suggested_priority text not null default 'Media' check (suggested_priority in ('Alta', 'Media', 'Baja')),
  assigned_to uuid references public.executives(id),
  kommo_lead_id text,
  kommo_url text,
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_commercial_board_leads_received_at on public.commercial_board_leads(received_at desc);
create index if not exists idx_commercial_board_leads_assigned_to on public.commercial_board_leads(assigned_to);

create table if not exists public.commercial_board_time_blocks (
  id text primary key,
  block_time time not null,
  block_label text not null,
  block_weight numeric not null default 0,
  assigned_leads_count integer not null default 0,
  call_goal integer not null default 0,
  calls_made integer not null default 0,
  messages_sent integer not null default 0,
  messages_received integer not null default 0,
  contacts_made integer not null default 0,
  sales_count integer not null default 0,
  active boolean not null default true
);

insert into public.commercial_board_time_blocks(id, block_time, block_label, block_weight)
values
  ('block-0800', '08:00', '8:00 AM', 0.15),
  ('block-1200', '12:00', '12:00 PM', 0.20),
  ('block-1430', '14:30', '2:30 PM', 0.20),
  ('block-1700', '17:00', '5:00 PM', 0.20),
  ('block-1900', '19:00', '7:00 PM', 0.15),
  ('block-2045', '20:45', '8:45 PM', 0.10)
on conflict (id) do update
set block_time = excluded.block_time,
    block_label = excluded.block_label,
    block_weight = excluded.block_weight,
    active = true;

create table if not exists public.lead_activity_events (
  id uuid primary key default gen_random_uuid(),
  lead_id text,
  kommo_lead_id text,
  executive_id uuid references public.executives(id),
  team_id uuid references public.teams(id),
  event_type text not null,
  direction text,
  event_at timestamptz not null default now(),
  source text not null default 'Kommo',
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_lead_activity_events_at on public.lead_activity_events(event_at desc);
create index if not exists idx_lead_activity_events_executive on public.lead_activity_events(executive_id);

create table if not exists public.commercial_board_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  scope text not null default 'company',
  executive_id uuid references public.executives(id),
  team_id uuid references public.teams(id),
  metrics jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.commercial_board_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.commercial_board_assignments enable row level security;
alter table public.commercial_board_leads enable row level security;
alter table public.commercial_board_time_blocks enable row level security;
alter table public.lead_activity_events enable row level security;
alter table public.commercial_board_snapshots enable row level security;
alter table public.commercial_board_settings enable row level security;

drop policy if exists "commercial board read authenticated" on public.commercial_board_assignments;
create policy "commercial board read authenticated"
on public.commercial_board_assignments for select
to authenticated
using (true);

drop policy if exists "commercial board leads read authenticated" on public.commercial_board_leads;
create policy "commercial board leads read authenticated"
on public.commercial_board_leads for select
to authenticated
using (true);

drop policy if exists "commercial board time blocks read authenticated" on public.commercial_board_time_blocks;
create policy "commercial board time blocks read authenticated"
on public.commercial_board_time_blocks for select
to authenticated
using (true);

drop policy if exists "lead activity read authenticated" on public.lead_activity_events;
create policy "lead activity read authenticated"
on public.lead_activity_events for select
to authenticated
using (true);

drop policy if exists "commercial board snapshots read authenticated" on public.commercial_board_snapshots;
create policy "commercial board snapshots read authenticated"
on public.commercial_board_snapshots for select
to authenticated
using (true);

drop policy if exists "commercial board settings read authenticated" on public.commercial_board_settings;
create policy "commercial board settings read authenticated"
on public.commercial_board_settings for select
to authenticated
using (true);

insert into public.role_module_permissions(role, permission_id)
values
  ('Superadministrador', 'board.view'),
  ('Superadministrador', 'board.manage'),
  ('Superadministrador', 'board.config'),
  ('Administrador', 'board.view'),
  ('Administrador', 'board.manage'),
  ('Administrador', 'board.config'),
  ('Jefe de ventas', 'board.view'),
  ('Jefe de ventas', 'board.manage'),
  ('Jefe de ventas', 'board.config'),
  ('Lider de ventas', 'board.view'),
  ('Lider de ventas', 'board.manage'),
  ('Ejecutivo', 'board.view'),
  ('Marketing', 'board.view'),
  ('Marketing', 'board.manage'),
  ('Solo lectura', 'board.view')
on conflict do nothing;
