-- Expansión de ventas como expediente comercial y permisos de Academia Comercial.

create table if not exists public.sale_participants (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade,
  full_name text not null,
  document_type text,
  document_number text,
  email text,
  phone text,
  country text,
  department text,
  province text,
  district text,
  workplace text,
  academic_degree text,
  profession text,
  license_number text,
  created_at timestamptz default now()
);

create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade,
  payment_date date,
  payment_time time,
  payment_concept text,
  payment_method text,
  payment_entity text,
  destination_holder text,
  operation_number text,
  expected_amount numeric default 0,
  paid_amount numeric default 0,
  payment_status text default 'Pendiente de validación',
  validated_by uuid references public.profiles(id),
  validated_at timestamptz,
  observation text,
  created_at timestamptz default now()
);

create table if not exists public.sale_payment_plan (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade,
  plan_type text,
  billing_type text,
  enrollment_amount numeric default 0,
  monthly_amount numeric default 0,
  monthly_count integer default 0,
  certificate_amount numeric default 0,
  total_program_amount numeric default 0,
  paid_amount numeric default 0,
  pending_amount numeric default 0,
  next_due_date date,
  created_at timestamptz default now()
);

create table if not exists public.sale_validation_logs (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade,
  previous_status text,
  new_status text,
  validated_by uuid references public.profiles(id),
  comment text,
  reason text,
  created_at timestamptz default now()
);

create table if not exists public.sale_followups (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade,
  followup_type text,
  title text,
  description text,
  due_date date,
  status text default 'Pendiente',
  assigned_to uuid references public.executives(id),
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.sale_attachments
  add column if not exists attachment_type text,
  add column if not exists file_name text,
  add column if not exists description text,
  add column if not exists uploaded_at timestamptz default now();

alter table public.sales
  add column if not exists commercial_status text,
  add column if not exists modality text,
  add column if not exists attention_channel text,
  add column if not exists paid_amount numeric default 0,
  add column if not exists pending_amount numeric default 0,
  add column if not exists payment_plan_type text,
  add column if not exists billing_type text,
  add column if not exists payment_concept text,
  add column if not exists operation_number text,
  add column if not exists payment_status text;

alter table public.product_types drop constraint if exists product_types_code_check;
alter table public.sales drop constraint if exists sales_lead_source_check;
alter table public.sales drop constraint if exists sales_validation_status_check;
alter table public.sales
  add constraint sales_validation_status_check
  check (validation_status in (
    'registrada',
    'pendiente_validacion',
    'validada',
    'observada',
    'rechazada',
    'anulada',
    'pago_parcial',
    'saldo_pendiente',
    'completada'
  ));

alter table public.sales_programs drop constraint if exists sales_programs_product_type_check;

alter table public.sale_participants enable row level security;
alter table public.sale_payments enable row level security;
alter table public.sale_payment_plan enable row level security;
alter table public.sale_validation_logs enable row level security;
alter table public.sale_followups enable row level security;

do $$
begin
  create policy "authenticated read sale participants"
    on public.sale_participants for select
    to authenticated
    using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "authenticated read sale payments"
    on public.sale_payments for select
    to authenticated
    using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "authenticated read sale payment plan"
    on public.sale_payment_plan for select
    to authenticated
    using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "authenticated read sale validation logs"
    on public.sale_validation_logs for select
    to authenticated
    using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "authenticated read sale followups"
    on public.sale_followups for select
    to authenticated
    using (true);
exception when duplicate_object then null;
end $$;

insert into public.role_module_permissions(role, permission_id)
select role, permission_id
from (
  values
    ('Superadministrador', 'training.view'),
    ('Superadministrador', 'training.manage'),
    ('Administrador', 'training.view'),
    ('Administrador', 'training.manage'),
    ('Jefe de ventas', 'training.view'),
    ('Jefe de ventas', 'training.manage'),
    ('Lider de ventas', 'training.view'),
    ('Ejecutivo', 'training.view'),
    ('Marketing', 'training.view'),
    ('Solo lectura', 'training.view')
) as permissions(role, permission_id)
on conflict do nothing;
