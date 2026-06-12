create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'Ejecutivo',
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.executives (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id),
  code text unique,
  full_name text not null,
  photo_url text,
  shift text,
  status text not null default 'Activo',
  goal_amount numeric not null default 0,
  current_sales numeric not null default 0,
  points numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#00A7EB',
  leader_id uuid references public.executives(id),
  goal_amount numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  executive_id uuid references public.executives(id) on delete cascade,
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  unique(team_id, executive_id)
);

create table if not exists public.product_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  point_weight numeric not null default 1,
  active boolean not null default true
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_type_id uuid references public.product_types(id),
  name text not null,
  modality text,
  start_date date,
  price numeric not null default 0,
  active boolean not null default true
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  executive_id uuid references public.executives(id),
  team_id uuid references public.teams(id),
  product_type_id uuid references public.product_types(id),
  product_id uuid references public.products(id),
  quantity integer not null default 1,
  gross_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  net_amount numeric not null default 0,
  payment_method text,
  lead_source text,
  validation_status text not null default 'pendiente_validacion',
  notes text,
  created_by uuid references public.profiles(id),
  validated_by uuid references public.profiles(id),
  validated_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_goals (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  scope text not null,
  team_id uuid references public.teams(id),
  executive_id uuid references public.executives(id),
  goal_amount numeric not null default 0,
  goal_points numeric not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sale_attachments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade,
  file_path text not null,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
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

create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  main_pain text,
  main_motivator text,
  frequency text,
  loyalty text,
  urgency text,
  price_sensitivity text,
  modality text,
  status text not null default 'Activo',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.executives enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.product_types enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.monthly_goals enable row level security;
alter table public.sale_attachments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.client_profiles enable row level security;

create or replace view public.v_current_ranking as
select
  e.id as executive_id,
  e.full_name,
  e.photo_url,
  t.name as team_name,
  coalesce(sum(s.quantity), 0) as total_quantity,
  coalesce(sum(s.net_amount), 0) as total_amount,
  coalesce(sum(s.quantity * pt.point_weight), 0) as total_points,
  dense_rank() over (order by coalesce(sum(s.quantity * pt.point_weight), 0) desc, coalesce(sum(s.net_amount), 0) desc) as rank
from public.executives e
left join public.sales s on s.executive_id = e.id and s.validation_status = 'validada'
left join public.teams t on t.id = coalesce(s.team_id, (select tm.team_id from public.team_members tm where tm.executive_id = e.id and tm.active limit 1))
left join public.product_types pt on pt.id = s.product_type_id
group by e.id, e.full_name, e.photo_url, t.name;

insert into public.product_types(code, name, point_weight)
values ('C', 'Curso', 1), ('CM', 'Curso Modular', 2), ('D', 'Diplomado', 4)
on conflict (code) do update set name = excluded.name, point_weight = excluded.point_weight;

create or replace function public.prevent_validated_sale_delete()
returns trigger
language plpgsql
as $$
begin
  if old.validation_status = 'validada' then
    raise exception 'Las ventas validadas no pueden eliminarse fisicamente; deben anularse con motivo.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_validated_sale_delete on public.sales;
create trigger trg_prevent_validated_sale_delete
before delete on public.sales
for each row execute function public.prevent_validated_sale_delete();
