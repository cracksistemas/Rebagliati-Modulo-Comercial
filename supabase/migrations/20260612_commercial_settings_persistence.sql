create table if not exists public.sales_programs (
  id text primary key,
  name text not null unique,
  product_type text not null check (product_type in ('Curso','Curso Modular','Diplomado')),
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.authorized_discounts (
  id text primary key,
  label text not null,
  amount numeric not null default 0 check (amount >= 0),
  discount_type text not null default 'amount' check (discount_type in ('amount','percent')),
  active boolean not null default true,
  requires_approval boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.authorized_discounts
add column if not exists discount_type text not null default 'amount'
check (discount_type in ('amount','percent'));

create table if not exists public.role_module_permissions (
  role text not null,
  permission_id text not null,
  created_at timestamptz not null default now(),
  primary key (role, permission_id)
);

alter table public.sales_programs enable row level security;
alter table public.authorized_discounts enable row level security;
alter table public.role_module_permissions enable row level security;

drop policy if exists "sales programs read authenticated" on public.sales_programs;
create policy "sales programs read authenticated" on public.sales_programs
for select to authenticated using (active = true or public.is_role(array['admin_sistema']));

drop policy if exists "sales programs insert authenticated" on public.sales_programs;
create policy "sales programs insert authenticated" on public.sales_programs
for insert to authenticated with check (auth.uid() is not null);

drop policy if exists "sales programs manage superadmin" on public.sales_programs;
create policy "sales programs manage superadmin" on public.sales_programs
for update to authenticated using (public.is_role(array['admin_sistema']))
with check (public.is_role(array['admin_sistema']));

drop policy if exists "discounts read authenticated" on public.authorized_discounts;
create policy "discounts read authenticated" on public.authorized_discounts
for select to authenticated using (active = true or public.is_role(array['admin_sistema']));

drop policy if exists "discounts manage superadmin" on public.authorized_discounts;
create policy "discounts manage superadmin" on public.authorized_discounts
for all to authenticated using (public.is_role(array['admin_sistema']))
with check (public.is_role(array['admin_sistema']));

drop policy if exists "role permissions read authenticated" on public.role_module_permissions;
create policy "role permissions read authenticated" on public.role_module_permissions
for select to authenticated using (auth.uid() is not null);

drop policy if exists "role permissions manage superadmin" on public.role_module_permissions;
create policy "role permissions manage superadmin" on public.role_module_permissions
for all to authenticated using (public.is_role(array['admin_sistema']))
with check (public.is_role(array['admin_sistema']));

insert into public.sales_programs (id, name, product_type, active)
values
  ('program-salud-ocupacional', 'Diplomado en Salud Ocupacional', 'Diplomado', true),
  ('program-emergencias', 'Emergencias y Desastres', 'Curso Modular', true),
  ('program-inyectoterapia', 'Inyectoterapia', 'Curso', true),
  ('program-uci', 'UCI y Cuidados Criticos', 'Diplomado', true)
on conflict (id) do update set
  name = excluded.name,
  product_type = excluded.product_type,
  active = excluded.active;

insert into public.authorized_discounts (id, label, amount, discount_type, active, requires_approval)
values
  ('discount-none', 'Sin descuento', 0, 'amount', true, false),
  ('discount-50', 'S/ 50 autorizado', 50, 'amount', true, false),
  ('discount-100', 'S/ 100 autorizado', 100, 'amount', true, false),
  ('discount-10pct', '10% autorizado', 10, 'percent', true, false),
  ('discount-special', 'Descuento especial con autorizacion', 0, 'amount', true, true)
on conflict (id) do update set
  label = excluded.label,
  amount = excluded.amount,
  discount_type = excluded.discount_type,
  active = excluded.active,
  requires_approval = excluded.requires_approval;

delete from public.role_module_permissions;

insert into public.role_module_permissions (role, permission_id)
values
  ('Superadministrador','dashboard.resumen'),
  ('Superadministrador','sales.new'),
  ('Superadministrador','sales.validation'),
  ('Superadministrador','ranking.executives'),
  ('Superadministrador','teams.view'),
  ('Superadministrador','executives.manage'),
  ('Superadministrador','goals.manage'),
  ('Superadministrador','customer-map.view'),
  ('Superadministrador','reports.export'),
  ('Superadministrador','settings.users'),
  ('Superadministrador','settings.roles'),
  ('Superadministrador','settings.discounts'),
  ('Administrador','dashboard.resumen'),
  ('Administrador','sales.new'),
  ('Administrador','sales.validation'),
  ('Administrador','ranking.executives'),
  ('Administrador','teams.view'),
  ('Administrador','executives.manage'),
  ('Administrador','goals.manage'),
  ('Administrador','customer-map.view'),
  ('Administrador','reports.export'),
  ('Jefe de ventas','dashboard.resumen'),
  ('Jefe de ventas','sales.new'),
  ('Jefe de ventas','sales.validation'),
  ('Jefe de ventas','ranking.executives'),
  ('Jefe de ventas','teams.view'),
  ('Jefe de ventas','executives.manage'),
  ('Jefe de ventas','goals.manage'),
  ('Jefe de ventas','customer-map.view'),
  ('Jefe de ventas','reports.export'),
  ('Lider de ventas','dashboard.resumen'),
  ('Lider de ventas','sales.new'),
  ('Lider de ventas','sales.validation'),
  ('Lider de ventas','ranking.executives'),
  ('Lider de ventas','teams.view'),
  ('Lider de ventas','customer-map.view'),
  ('Lider de ventas','reports.export'),
  ('Ejecutivo','dashboard.resumen'),
  ('Ejecutivo','sales.new'),
  ('Ejecutivo','ranking.executives'),
  ('Ejecutivo','teams.view'),
  ('Ejecutivo','customer-map.view'),
  ('Marketing','dashboard.resumen'),
  ('Marketing','ranking.executives'),
  ('Marketing','teams.view'),
  ('Marketing','customer-map.view'),
  ('Marketing','reports.export'),
  ('Solo lectura','dashboard.resumen'),
  ('Solo lectura','ranking.executives'),
  ('Solo lectura','teams.view'),
  ('Solo lectura','customer-map.view'),
  ('Solo lectura','reports.export')
on conflict do nothing;
