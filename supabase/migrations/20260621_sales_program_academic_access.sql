alter table public.sales_programs
  add column if not exists access_config jsonb not null default '{}'::jsonb;

alter table public.sales_programs
  add column if not exists academic_config jsonb not null default '{}'::jsonb;

comment on column public.sales_programs.access_config is
  'Reglas comerciales para ingreso al aula, habilitacion, credenciales y vigencia del acceso.';

comment on column public.sales_programs.academic_config is
  'Resumen operativo de modulos, clases, materiales, evaluacion, progreso y certificado.';
