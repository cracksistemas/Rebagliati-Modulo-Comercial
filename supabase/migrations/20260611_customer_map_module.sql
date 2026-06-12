create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text not null default '',
  commercial_summary text not null default '',
  avatar text,
  professional_area text,
  academic_level text,
  main_pain text,
  main_motivator text,
  training_frequency text,
  loyalty_level text,
  urgency_level text,
  price_sensitivity text,
  preferred_modality text,
  certification_type text,
  commercial_temperature integer not null default 50,
  status text not null default 'Borrador' check (status in ('Activo','En revision','Archivado','Borrador')),
  channels text[] not null default '{}',
  motivators text[] not null default '{}',
  needs text[] not null default '{}',
  avoid_saying text[] not null default '{}',
  marketing_insight jsonb not null default '{}'::jsonb,
  conversation_guide jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_pain_points (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  intensity text not null check (intensity in ('Bajo','Medio','Alto','Critico')),
  stage text not null check (stage in ('Curioso','Interesado','Comparando opciones','Listo para comprar','Recurrente')),
  recommended_argument text,
  related_courses text[] not null default '{}',
  status text not null default 'Activo' check (status in ('Activo','Archivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_objections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  objection text not null,
  real_meaning text,
  suggested_response text,
  risk_level text,
  resolver text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_sales_arguments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  title text not null,
  situation text,
  suggested_text text not null,
  related_pain text,
  effectiveness text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_recommended_programs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  name text not null,
  modality text,
  duration text,
  certification text,
  solves_pain text,
  priority text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_suggested_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  message_type text not null,
  message_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_profile_change_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  user_id uuid references public.profiles(id),
  field_name text not null,
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz not null default now()
);

create or replace trigger customer_profiles_touch_updated_at
before update on public.customer_profiles
for each row execute function public.touch_updated_at();

create or replace trigger customer_pain_points_touch_updated_at
before update on public.customer_pain_points
for each row execute function public.touch_updated_at();

alter table public.customer_profiles enable row level security;
alter table public.customer_pain_points enable row level security;
alter table public.customer_objections enable row level security;
alter table public.customer_sales_arguments enable row level security;
alter table public.customer_recommended_programs enable row level security;
alter table public.customer_suggested_messages enable row level security;
alter table public.customer_profile_change_logs enable row level security;

drop policy if exists "customer map read authenticated" on public.customer_profiles;
create policy "customer map read authenticated"
on public.customer_profiles for select
to authenticated
using (status = 'Activo' or public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte']));

drop policy if exists "customer map manage managers" on public.customer_profiles;
create policy "customer map manage managers"
on public.customer_profiles for all
to authenticated
using (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte']))
with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte']));

drop policy if exists "customer child read authenticated" on public.customer_pain_points;
create policy "customer child read authenticated" on public.customer_pain_points for select to authenticated using (true);
drop policy if exists "customer child manage managers" on public.customer_pain_points;
create policy "customer child manage managers" on public.customer_pain_points for all to authenticated using (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte'])) with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte']));

drop policy if exists "customer objections read authenticated" on public.customer_objections;
create policy "customer objections read authenticated" on public.customer_objections for select to authenticated using (true);
drop policy if exists "customer objections manage managers" on public.customer_objections;
create policy "customer objections manage managers" on public.customer_objections for all to authenticated using (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte'])) with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte']));

drop policy if exists "customer arguments read authenticated" on public.customer_sales_arguments;
create policy "customer arguments read authenticated" on public.customer_sales_arguments for select to authenticated using (true);
drop policy if exists "customer arguments manage managers" on public.customer_sales_arguments;
create policy "customer arguments manage managers" on public.customer_sales_arguments for all to authenticated using (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte'])) with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte']));

drop policy if exists "customer programs read authenticated" on public.customer_recommended_programs;
create policy "customer programs read authenticated" on public.customer_recommended_programs for select to authenticated using (true);
drop policy if exists "customer programs manage managers" on public.customer_recommended_programs;
create policy "customer programs manage managers" on public.customer_recommended_programs for all to authenticated using (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte'])) with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte']));

drop policy if exists "customer messages read authenticated" on public.customer_suggested_messages;
create policy "customer messages read authenticated" on public.customer_suggested_messages for select to authenticated using (true);
drop policy if exists "customer messages manage managers" on public.customer_suggested_messages;
create policy "customer messages manage managers" on public.customer_suggested_messages for all to authenticated using (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte'])) with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte']));

drop policy if exists "customer change logs read managers" on public.customer_profile_change_logs;
create policy "customer change logs read managers" on public.customer_profile_change_logs for select to authenticated using (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte']));
drop policy if exists "customer change logs insert managers" on public.customer_profile_change_logs;
create policy "customer change logs insert managers" on public.customer_profile_change_logs for insert to authenticated with check (public.is_role(array['admin_sistema','gerencia','jefe_ventas','marketing_soporte']));
