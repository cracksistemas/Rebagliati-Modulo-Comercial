create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('gerencia','jefe_ventas','lider_ventas','ejecutivo','marketing_soporte','admin_sistema')),
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.executives (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  code text unique,
  full_name text not null,
  photo_url text,
  shift text,
  status text not null default 'activo',
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#00A7EB',
  leader_id uuid references public.executives(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  executive_id uuid not null references public.executives(id) on delete cascade,
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  unique (team_id, executive_id, start_date)
);

create table if not exists public.product_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('C','CM','D')),
  name text not null,
  point_weight numeric not null check (point_weight > 0),
  active boolean not null default true
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_type_id uuid not null references public.product_types(id),
  name text not null,
  modality text,
  start_date date,
  price numeric not null default 0 check (price >= 0),
  active boolean not null default true
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  executive_id uuid not null references public.executives(id),
  team_id uuid not null references public.teams(id),
  product_type_id uuid not null references public.product_types(id),
  product_id uuid references public.products(id),
  quantity integer not null check (quantity > 0),
  gross_amount numeric not null check (gross_amount >= 0),
  discount_amount numeric not null default 0 check (discount_amount >= 0),
  net_amount numeric generated always as (greatest(gross_amount - discount_amount, 0)) stored,
  payment_method text not null,
  lead_source text not null check (lead_source in ('Meta Ads','WhatsApp','Base','Referido','Organico','Otro')),
  validation_status text not null default 'pendiente_validacion' check (validation_status in ('registrada','pendiente_validacion','validada','observada','anulada')),
  notes text,
  annulment_reason text,
  created_by uuid not null references public.profiles(id),
  validated_by uuid references public.profiles(id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_goals (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  scope text not null check (scope in ('company','team','executive')),
  team_id uuid references public.teams(id),
  executive_id uuid references public.executives(id),
  goal_amount numeric not null check (goal_amount >= 0),
  goal_points numeric not null default 0 check (goal_points >= 0),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint monthly_goals_scope_target check (
    (scope = 'company' and team_id is null and executive_id is null)
    or (scope = 'team' and team_id is not null and executive_id is null)
    or (scope = 'executive' and executive_id is not null)
  )
);

create table if not exists public.sale_attachments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  file_path text not null,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  executive_id uuid not null references public.executives(id),
  team_id uuid references public.teams(id),
  total_quantity integer not null default 0,
  total_amount numeric not null default 0,
  total_points numeric not null default 0,
  rank integer not null,
  previous_rank integer,
  computed_at timestamptz not null default now()
);

create table if not exists public.monthly_closures (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,
  closed boolean not null default false,
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  notes text
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  user_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

insert into public.product_types (code, name, point_weight)
values ('C', 'Curso', 1), ('CM', 'Curso Modular', 2), ('D', 'Diplomado', 4)
on conflict (code) do update set name = excluded.name, point_weight = excluded.point_weight;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.is_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = any(roles), false)
$$;

create or replace function public.current_executive_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.executives where profile_id = auth.uid() limit 1
$$;

create or replace function public.leads_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    join public.executives e on e.id = t.leader_id
    where t.id = target_team_id and e.profile_id = auth.uid()
  )
$$;

create or replace function public.month_is_closed(target_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.monthly_closures
    where month = date_trunc('month', target_date)::date and closed = true
  )
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_closed_month_changes()
returns trigger
language plpgsql
as $$
declare
  target_date date;
begin
  target_date := coalesce(new.sale_date, old.sale_date);
  if public.month_is_closed(target_date) then
    raise exception 'El mes % esta cerrado y no permite cambios', date_trunc('month', target_date)::date;
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.prevent_sales_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Las ventas no se eliminan fisicamente. Use validation_status = anulada con motivo.';
end;
$$;

create or replace function public.enforce_sales_validation_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.validation_status is distinct from old.validation_status then
    if new.validation_status in ('validada','observada','anulada')
      and not (
        public.is_role(array['gerencia','jefe_ventas','admin_sistema'])
        or public.leads_team(old.team_id)
      ) then
      raise exception 'Solo lider, jefe, gerencia o admin pueden validar, observar o anular ventas.';
    end if;

    if old.validation_status = 'validada' and new.validation_status <> 'anulada'
      and not public.is_role(array['gerencia','jefe_ventas','admin_sistema']) then
      raise exception 'Una venta validada solo puede ser modificada por jefatura, gerencia o admin.';
    end if;
  end if;

  if new.validation_status = 'validada' then
    new.validated_by := coalesce(new.validated_by, auth.uid());
    new.validated_at := coalesce(new.validated_at, now());
  end if;

  if new.validation_status = 'anulada' and nullif(new.annulment_reason, '') is null then
    raise exception 'Toda anulacion requiere motivo.';
  end if;

  return new;
end;
$$;

create or replace function public.audit_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_id uuid;
begin
  row_id := coalesce(new.id, old.id);
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  values (tg_table_name, row_id, tg_op, to_jsonb(old), to_jsonb(new), auth.uid());
  return coalesce(new, old);
end;
$$;

create or replace trigger sales_touch_updated_at
before update on public.sales
for each row execute function public.touch_updated_at();

create or replace trigger sales_prevent_closed_month_changes
before insert or update on public.sales
for each row execute function public.prevent_closed_month_changes();

create or replace trigger sales_no_physical_delete
before delete on public.sales
for each row execute function public.prevent_sales_delete();

create or replace trigger sales_validation_rules
before update on public.sales
for each row execute function public.enforce_sales_validation_rules();

create or replace trigger sales_audit_changes
after insert or update or delete on public.sales
for each row execute function public.audit_row_changes();

create or replace trigger teams_audit_changes
after insert or update or delete on public.teams
for each row execute function public.audit_row_changes();

create or replace trigger team_members_audit_changes
after insert or update or delete on public.team_members
for each row execute function public.audit_row_changes();

create or replace trigger goals_audit_changes
after insert or update or delete on public.monthly_goals
for each row execute function public.audit_row_changes();

alter table public.profiles enable row level security;
alter table public.executives enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.product_types enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.monthly_goals enable row level security;
alter table public.sale_attachments enable row level security;
alter table public.ranking_snapshots enable row level security;
alter table public.monthly_closures enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles self or managers read"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_role(array['gerencia','admin_sistema']));

create policy "profiles admin manage"
on public.profiles for all
to authenticated
using (public.is_role(array['admin_sistema']))
with check (public.is_role(array['admin_sistema']));

create policy "executives active read"
on public.executives for select
to authenticated
using (status = 'activo' or public.is_role(array['gerencia','jefe_ventas','admin_sistema']));

create policy "executives managers manage"
on public.executives for all
to authenticated
using (public.is_role(array['jefe_ventas','admin_sistema']))
with check (public.is_role(array['jefe_ventas','admin_sistema']));

create policy "teams active read"
on public.teams for select
to authenticated
using (active = true or public.is_role(array['gerencia','jefe_ventas','admin_sistema']));

create policy "teams managers manage"
on public.teams for all
to authenticated
using (public.is_role(array['jefe_ventas','admin_sistema']))
with check (public.is_role(array['jefe_ventas','admin_sistema']));

create policy "team members read authenticated"
on public.team_members for select
to authenticated
using (true);

create policy "team members managers manage"
on public.team_members for all
to authenticated
using (public.is_role(array['jefe_ventas','admin_sistema']))
with check (public.is_role(array['jefe_ventas','admin_sistema']));

create policy "catalog read authenticated"
on public.product_types for select
to authenticated
using (active = true or public.is_role(array['gerencia','jefe_ventas','admin_sistema']));

create policy "catalog managers manage product types"
on public.product_types for all
to authenticated
using (public.is_role(array['gerencia','jefe_ventas','admin_sistema']))
with check (public.is_role(array['gerencia','jefe_ventas','admin_sistema']));

create policy "products read authenticated"
on public.products for select
to authenticated
using (active = true or public.is_role(array['gerencia','jefe_ventas','admin_sistema']));

create policy "products managers manage"
on public.products for all
to authenticated
using (public.is_role(array['gerencia','jefe_ventas','admin_sistema']))
with check (public.is_role(array['gerencia','jefe_ventas','admin_sistema']));

create policy "sales read by role scope"
on public.sales for select
to authenticated
using (
  public.is_role(array['gerencia','jefe_ventas','admin_sistema','marketing_soporte'])
  or executive_id = public.current_executive_id()
  or public.leads_team(team_id)
);

create policy "sales insert own or managers"
on public.sales for insert
to authenticated
with check (
  not public.month_is_closed(sale_date)
  and created_by = auth.uid()
  and validation_status in ('registrada','pendiente_validacion')
  and (
    executive_id = public.current_executive_id()
    or public.is_role(array['gerencia','jefe_ventas','admin_sistema'])
  )
);

create policy "sales update scoped"
on public.sales for update
to authenticated
using (
  not public.month_is_closed(sale_date)
  and (
    public.is_role(array['gerencia','jefe_ventas','admin_sistema'])
    or public.leads_team(team_id)
    or (executive_id = public.current_executive_id() and validation_status in ('registrada','pendiente_validacion','observada'))
  )
)
with check (
  not public.month_is_closed(sale_date)
  and (
    public.is_role(array['gerencia','jefe_ventas','admin_sistema'])
    or public.leads_team(team_id)
    or (executive_id = public.current_executive_id() and validation_status in ('registrada','pendiente_validacion','observada'))
  )
  and (
    validation_status <> 'anulada'
    or nullif(annulment_reason, '') is not null
  )
);

create policy "goals read authenticated"
on public.monthly_goals for select
to authenticated
using (true);

create policy "goals managers manage"
on public.monthly_goals for all
to authenticated
using (public.is_role(array['gerencia','jefe_ventas','admin_sistema']))
with check (public.is_role(array['gerencia','jefe_ventas','admin_sistema']));

create policy "attachments read by sale scope"
on public.sale_attachments for select
to authenticated
using (
  exists (
    select 1 from public.sales s
    where s.id = sale_id
    and (
      public.is_role(array['gerencia','jefe_ventas','admin_sistema','marketing_soporte'])
      or s.executive_id = public.current_executive_id()
      or public.leads_team(s.team_id)
    )
  )
);

create policy "attachments insert own sale"
on public.sale_attachments for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.sales s
    where s.id = sale_id
    and (s.executive_id = public.current_executive_id() or public.is_role(array['gerencia','jefe_ventas','admin_sistema']))
  )
);

create policy "snapshots read authenticated"
on public.ranking_snapshots for select
to authenticated
using (true);

create policy "snapshots managers write"
on public.ranking_snapshots for all
to authenticated
using (public.is_role(array['gerencia','jefe_ventas','admin_sistema']))
with check (public.is_role(array['gerencia','jefe_ventas','admin_sistema']));

create policy "closures read authenticated"
on public.monthly_closures for select
to authenticated
using (true);

create policy "closures gerencia manage"
on public.monthly_closures for all
to authenticated
using (public.is_role(array['gerencia','admin_sistema']))
with check (public.is_role(array['gerencia','admin_sistema']));

create policy "audit read only gerencia admin"
on public.audit_logs for select
to authenticated
using (public.is_role(array['gerencia','admin_sistema']));

create policy "audit no client writes"
on public.audit_logs for insert
to authenticated
with check (false);

create or replace view public.v_monthly_sales_by_executive
with (security_invoker = true) as
select
  date_trunc('month', s.sale_date)::date as month,
  e.id as executive_id,
  e.full_name,
  e.photo_url,
  t.id as team_id,
  t.name as team_name,
  sum(s.quantity)::integer as total_quantity,
  sum(s.net_amount) as total_amount,
  sum(s.quantity * pt.point_weight) as total_points
from public.sales s
join public.executives e on e.id = s.executive_id
join public.teams t on t.id = s.team_id
join public.product_types pt on pt.id = s.product_type_id
where s.validation_status = 'validada'
group by 1, e.id, e.full_name, e.photo_url, t.id, t.name;

create or replace view public.v_monthly_sales_by_team
with (security_invoker = true) as
select
  date_trunc('month', s.sale_date)::date as month,
  t.id as team_id,
  t.name,
  t.color,
  count(distinct s.executive_id)::integer as active_executives,
  sum(s.quantity)::integer as total_quantity,
  sum(s.net_amount) as total_amount,
  sum(s.quantity * pt.point_weight) as total_points
from public.sales s
join public.teams t on t.id = s.team_id
join public.product_types pt on pt.id = s.product_type_id
where s.validation_status = 'validada'
group by 1, t.id, t.name, t.color;

create or replace view public.v_current_ranking
with (security_invoker = true) as
select
  r.month,
  r.executive_id,
  r.full_name,
  r.photo_url,
  r.team_id,
  r.team_name,
  r.total_quantity,
  r.total_amount,
  r.total_points,
  dense_rank() over (order by r.total_points desc, r.total_amount desc) as rank,
  rs.rank as previous_rank,
  coalesce(rs.rank, dense_rank() over (order by r.total_points desc, r.total_amount desc))
    - dense_rank() over (order by r.total_points desc, r.total_amount desc) as movement
from public.v_monthly_sales_by_executive r
left join public.ranking_snapshots rs
  on rs.executive_id = r.executive_id
  and rs.month = (r.month - interval '1 month')::date
where r.month = date_trunc('month', current_date)::date;

create or replace view public.v_company_goal_progress
with (security_invoker = true) as
select
  mg.month,
  mg.goal_amount,
  coalesce(sum(s.net_amount) filter (where s.validation_status = 'validada'), 0) as accumulated,
  greatest(mg.goal_amount - coalesce(sum(s.net_amount) filter (where s.validation_status = 'validada'), 0), 0) as gap,
  case when mg.goal_amount > 0
    then coalesce(sum(s.net_amount) filter (where s.validation_status = 'validada'), 0) / mg.goal_amount * 100
    else 0
  end as progress_pct
from public.monthly_goals mg
left join public.sales s on date_trunc('month', s.sale_date)::date = mg.month
where mg.scope = 'company'
group by mg.month, mg.goal_amount;

create or replace view public.v_team_contribution
with (security_invoker = true) as
select
  team.month,
  team.team_id,
  team.name,
  team.total_amount,
  team.total_points,
  case when total.company_amount > 0 then team.total_amount / total.company_amount * 100 else 0 end as contribution_pct
from public.v_monthly_sales_by_team team
join (
  select month, sum(total_amount) as company_amount
  from public.v_monthly_sales_by_team
  group by month
) total on total.month = team.month;

create or replace view public.v_executive_contribution
with (security_invoker = true) as
select
  executive.month,
  executive.executive_id,
  executive.full_name,
  executive.team_id,
  executive.total_amount,
  executive.total_points,
  case when total.company_amount > 0 then executive.total_amount / total.company_amount * 100 else 0 end as contribution_pct
from public.v_monthly_sales_by_executive executive
join (
  select month, sum(total_amount) as company_amount
  from public.v_monthly_sales_by_executive
  group by month
) total on total.month = executive.month;

create or replace view public.v_product_mix_by_month
with (security_invoker = true) as
select
  date_trunc('month', s.sale_date)::date as month,
  pt.code,
  pt.name,
  sum(s.quantity)::integer as total_quantity,
  sum(s.net_amount) as total_amount
from public.sales s
join public.product_types pt on pt.id = s.product_type_id
where s.validation_status = 'validada'
group by 1, pt.code, pt.name;

create or replace view public.v_pending_sales_validation
with (security_invoker = true) as
select
  s.*,
  e.full_name as executive_name,
  t.name as team_name,
  p.name as product_name
from public.sales s
join public.executives e on e.id = s.executive_id
join public.teams t on t.id = s.team_id
left join public.products p on p.id = s.product_id
where s.validation_status in ('registrada','pendiente_validacion','observada');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('executive-photos', 'executive-photos', false, 5242880, array['image/png','image/jpeg','image/webp']),
  ('sale-evidences', 'sale-evidences', false, 10485760, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "executive photos read authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'executive-photos');

create policy "executive photos managers upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'executive-photos' and public.is_role(array['jefe_ventas','admin_sistema']));

create policy "sale evidences scoped read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'sale-evidences'
  and (
    public.is_role(array['gerencia','jefe_ventas','admin_sistema'])
    or exists (
      select 1
      from public.sale_attachments a
      join public.sales s on s.id = a.sale_id
      where a.file_path = name
      and (s.executive_id = public.current_executive_id() or public.leads_team(s.team_id))
    )
  )
);

create policy "sale evidences upload own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'sale-evidences'
  and (
    public.is_role(array['gerencia','jefe_ventas','admin_sistema'])
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);
