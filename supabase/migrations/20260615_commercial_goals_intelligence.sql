create table if not exists public.commercial_goals (
  id uuid primary key default gen_random_uuid(),
  period_month integer not null check (period_month between 1 and 12),
  period_year integer not null check (period_year >= 2020),
  goal_name text not null default 'Meta mensual empresa',
  goal_type text not null default 'Venta neta',
  target_amount numeric not null check (target_amount > 0),
  currency text not null default 'PEN',
  status text not null default 'Activa' check (status in ('Borrador','Activa','Cerrada','Recalculada','Archivada')),
  scope text not null default 'company' check (scope in ('company','team','executive','product','channel')),
  team_id uuid references public.teams(id),
  executive_id uuid references public.executives(id),
  product_type_id uuid references public.product_types(id),
  channel text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index if not exists commercial_goals_one_active_target
on public.commercial_goals (
  period_month,
  period_year,
  goal_type,
  scope,
  coalesce(team_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(executive_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(product_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(channel, '')
)
where status = 'Activa';

create table if not exists public.commercial_goal_versions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  previous_target_amount numeric not null,
  new_target_amount numeric not null,
  change_reason text not null,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now()
);

create table if not exists public.commercial_goal_daily_distribution (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.commercial_goals(id) on delete cascade,
  date date not null,
  day_name text not null,
  day_type text not null default 'Dia normal',
  day_weight numeric not null default 1,
  daily_target numeric not null default 0,
  actual_sales numeric not null default 0,
  daily_gap numeric not null default 0,
  expected_accumulated numeric not null default 0,
  actual_accumulated numeric not null default 0,
  status text not null default 'Sin venta',
  comment text,
  unique (goal_id, date)
);

create table if not exists public.commercial_goal_weekly_distribution (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.commercial_goals(id) on delete cascade,
  week_number integer not null,
  start_date date not null,
  end_date date not null,
  week_weight numeric not null default 0,
  weekly_target numeric not null default 0,
  actual_sales numeric not null default 0,
  weekly_gap numeric not null default 0,
  required_to_close numeric not null default 0,
  status text not null default 'Sin venta',
  comment text,
  unique (goal_id, week_number)
);

create table if not exists public.commercial_forecast_snapshots (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.commercial_goals(id) on delete cascade,
  snapshot_date date not null default current_date,
  actual_sales numeric not null default 0,
  expected_sales_to_date numeric not null default 0,
  linear_forecast numeric not null default 0,
  weighted_forecast numeric not null default 0,
  moving_average_forecast numeric not null default 0,
  funnel_forecast numeric not null default 0,
  smart_forecast numeric not null default 0,
  conservative_forecast numeric not null default 0,
  optimistic_forecast numeric not null default 0,
  confidence_level text not null default 'Baja',
  status text not null default 'En revision',
  created_at timestamptz not null default now()
);

create table if not exists public.commercial_goal_alerts (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.commercial_goals(id) on delete cascade,
  alert_type text not null,
  severity text not null default 'Media' check (severity in ('Baja','Media','Alta','Critica')),
  title text not null,
  description text not null,
  recommendation text not null,
  status text not null default 'Nueva' check (status in ('Nueva','Vista','En seguimiento','Resuelta','Ignorada')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.commercial_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  import_type text not null,
  records_total integer not null default 0,
  records_imported integer not null default 0,
  records_rejected integer not null default 0,
  records_warning integer not null default 0,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  status text not null default 'Pendiente',
  error_report_url text
);

create table if not exists public.commercial_sales_records (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  amount numeric not null default 0,
  net_amount numeric not null default 0,
  executive_id uuid references public.executives(id),
  team_id uuid references public.teams(id),
  product_id uuid references public.products(id),
  course_code text,
  channel text,
  campaign_id text,
  status text not null default 'validada',
  source text not null default 'manual',
  import_batch_id uuid references public.commercial_import_batches(id),
  created_at timestamptz not null default now()
);

alter table public.commercial_goals enable row level security;
alter table public.commercial_goal_versions enable row level security;
alter table public.commercial_goal_daily_distribution enable row level security;
alter table public.commercial_goal_weekly_distribution enable row level security;
alter table public.commercial_forecast_snapshots enable row level security;
alter table public.commercial_goal_alerts enable row level security;
alter table public.commercial_import_batches enable row level security;
alter table public.commercial_sales_records enable row level security;

drop policy if exists "commercial goals read" on public.commercial_goals;
create policy "commercial goals read" on public.commercial_goals
for select to authenticated using (true);

drop policy if exists "commercial goals manage" on public.commercial_goals;
create policy "commercial goals manage" on public.commercial_goals
for all to authenticated
using (public.is_role(array['admin_sistema','gerencia','jefe_ventas']))
with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas']));

drop policy if exists "commercial goal versions read" on public.commercial_goal_versions;
create policy "commercial goal versions read" on public.commercial_goal_versions
for select to authenticated using (public.is_role(array['admin_sistema','gerencia','jefe_ventas']));

drop policy if exists "commercial goal versions insert" on public.commercial_goal_versions;
create policy "commercial goal versions insert" on public.commercial_goal_versions
for insert to authenticated with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas']));

drop policy if exists "commercial goal plans read" on public.commercial_goal_daily_distribution;
create policy "commercial goal plans read" on public.commercial_goal_daily_distribution
for select to authenticated using (true);

drop policy if exists "commercial goal weekly read" on public.commercial_goal_weekly_distribution;
create policy "commercial goal weekly read" on public.commercial_goal_weekly_distribution
for select to authenticated using (true);

drop policy if exists "commercial forecast read" on public.commercial_forecast_snapshots;
create policy "commercial forecast read" on public.commercial_forecast_snapshots
for select to authenticated using (true);

drop policy if exists "commercial alerts read" on public.commercial_goal_alerts;
create policy "commercial alerts read" on public.commercial_goal_alerts
for select to authenticated using (true);

drop policy if exists "commercial import managers" on public.commercial_import_batches;
create policy "commercial import managers" on public.commercial_import_batches
for all to authenticated
using (public.is_role(array['admin_sistema','gerencia','jefe_ventas']))
with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas']));

drop policy if exists "commercial sales records managers" on public.commercial_sales_records;
create policy "commercial sales records managers" on public.commercial_sales_records
for all to authenticated
using (public.is_role(array['admin_sistema','gerencia','jefe_ventas']))
with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas']));
