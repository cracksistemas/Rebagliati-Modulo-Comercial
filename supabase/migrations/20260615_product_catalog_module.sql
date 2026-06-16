alter table public.sales_programs drop constraint if exists sales_programs_product_type_check;

alter table public.sales_programs add column if not exists code text;
alter table public.sales_programs add column if not exists base_product_name text;
alter table public.sales_programs add column if not exists edition_name text;
alter table public.sales_programs add column if not exists area text;
alter table public.sales_programs add column if not exists status text default 'Borrador';
alter table public.sales_programs add column if not exists modality text;
alter table public.sales_programs add column if not exists start_date date;
alter table public.sales_programs add column if not exists end_date date;
alter table public.sales_programs add column if not exists duration_value numeric;
alter table public.sales_programs add column if not exists duration_unit text;
alter table public.sales_programs add column if not exists class_days text;
alter table public.sales_programs add column if not exists schedule_summary text;
alter table public.sales_programs add column if not exists academic_hours numeric;
alter table public.sales_programs add column if not exists credits numeric;
alter table public.sales_programs add column if not exists certification_type text;
alter table public.sales_programs add column if not exists certifying_institution text;
alter table public.sales_programs add column if not exists allied_institutions text;
alter table public.sales_programs add column if not exists target_audience text;
alter table public.sales_programs add column if not exists allowed_profiles text[] default '{}';
alter table public.sales_programs add column if not exists short_description text;
alter table public.sales_programs add column if not exists commercial_description text;
alter table public.sales_programs add column if not exists academic_owner text;
alter table public.sales_programs add column if not exists commercial_owner text;
alter table public.sales_programs add column if not exists price_from numeric default 0;
alter table public.sales_programs add column if not exists enrollment_amount numeric default 0;
alter table public.sales_programs add column if not exists monthly_amount numeric default 0;
alter table public.sales_programs add column if not exists monthly_count numeric default 0;
alter table public.sales_programs add column if not exists single_payment_amount numeric default 0;
alter table public.sales_programs add column if not exists certificate_amount numeric default 0;
alter table public.sales_programs add column if not exists promo_name text;
alter table public.sales_programs add column if not exists promo_valid_until date;
alter table public.sales_programs add column if not exists form_url text;
alter table public.sales_programs add column if not exists whatsapp_group_url text;
alter table public.sales_programs add column if not exists zoom_url text;
alter table public.sales_programs add column if not exists campus_url text;
alter table public.sales_programs add column if not exists brochure_url text;
alter table public.sales_programs add column if not exists image_url text;
alter table public.sales_programs add column if not exists video_url text;
alter table public.sales_programs add column if not exists template_text text;
alter table public.sales_programs add column if not exists template_variants jsonb default '{}'::jsonb;
alter table public.sales_programs add column if not exists sessions jsonb default '[]'::jsonb;
alter table public.sales_programs add column if not exists price_tiers jsonb default '[]'::jsonb;
alter table public.sales_programs add column if not exists change_log jsonb default '[]'::jsonb;
alter table public.sales_programs add column if not exists updated_by uuid references public.profiles(id);
alter table public.sales_programs add column if not exists updated_at timestamptz default now();

create unique index if not exists sales_programs_active_code_uidx
  on public.sales_programs (code)
  where active = true and code is not null and code <> '';

alter table public.sales add column if not exists product_edition_id text;
alter table public.sales add column if not exists price_tier_id text;
alter table public.sales add column if not exists official_amount numeric;
alter table public.sales add column if not exists sold_amount numeric;
alter table public.sales add column if not exists price_difference numeric;
alter table public.sales add column if not exists price_override_reason text;

insert into public.role_module_permissions(role, permission_id)
values
  ('Superadministrador', 'products.view'),
  ('Superadministrador', 'products.create'),
  ('Superadministrador', 'products.edit'),
  ('Superadministrador', 'products.archive'),
  ('Superadministrador', 'products.activate'),
  ('Superadministrador', 'products.manage_prices'),
  ('Superadministrador', 'products.manage_links'),
  ('Superadministrador', 'products.generate_templates'),
  ('Superadministrador', 'products.import_from_template'),
  ('Superadministrador', 'products.view_audit'),
  ('Administrador', 'products.view'),
  ('Administrador', 'products.create'),
  ('Administrador', 'products.edit'),
  ('Administrador', 'products.archive'),
  ('Administrador', 'products.activate'),
  ('Administrador', 'products.manage_prices'),
  ('Administrador', 'products.manage_links'),
  ('Administrador', 'products.generate_templates'),
  ('Administrador', 'products.import_from_template'),
  ('Administrador', 'products.view_audit'),
  ('Jefe de ventas', 'products.view'),
  ('Jefe de ventas', 'products.edit'),
  ('Jefe de ventas', 'products.generate_templates'),
  ('Marketing', 'products.view'),
  ('Marketing', 'products.create'),
  ('Marketing', 'products.edit'),
  ('Marketing', 'products.manage_links'),
  ('Marketing', 'products.generate_templates'),
  ('Marketing', 'products.import_from_template'),
  ('Ejecutivo', 'products.view')
on conflict do nothing;
