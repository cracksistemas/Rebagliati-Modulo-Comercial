-- Importa acumulado de ranking Junio 2026 desde Google Sheets.
-- Fuente: RANKING DE VENTAS 2026, bloque "JUNIO DEL 2026", fila 376.
-- Carga una venta agregada por ejecutivo y tipo de producto hasta el 12/06/2026.
-- Monto usado: "GANADO HASTA AHORA" = C * 1 + CM * 2 + D * 6.

begin;

alter table public.teams
add column if not exists goal_amount numeric not null default 0;

alter table public.executives
add column if not exists goal_amount numeric not null default 0,
add column if not exists current_sales numeric not null default 0,
add column if not exists points numeric not null default 0,
add column if not exists previous_rank integer;

alter table public.sales
add column if not exists source_key text;

create unique index if not exists sales_source_key_unique_idx
on public.sales(source_key)
where source_key is not null;

insert into public.product_types(code, name, point_weight, active)
values
  ('C', 'Curso', 1, true),
  ('CM', 'Curso Modular', 2, true),
  ('D', 'Diplomado', 4, true)
on conflict (code) do update set
  name = excluded.name,
  point_weight = excluded.point_weight,
  active = true;

insert into public.teams(name, color, goal_amount, active)
select 'Equipo por asignar - Importacion', '#8E8E93', 0, true
where not exists (
  select 1 from public.teams where lower(name) = lower('Equipo por asignar - Importacion')
);

with source(executive_name, c_qty, cm_qty, d_qty) as (
  values
    ('MARIANA', 39, 11, 21),
    ('ELIANA', 93, 7, 32),
    ('DAYELI', 0, 0, 0),
    ('ALEXANDRA', 41, 3, 13),
    ('BONNIE', 1, 0, 1),
    ('ANA GABRIELA', 2, 1, 1),
    ('PATT', 0, 0, 0),
    ('BRIAN', 1, 0, 0),
    ('MILUSKA', 0, 0, 0),
    ('RENATO', 1, 0, 0),
    ('KEVIN', 30, 3, 7),
    ('ANAROSA', 20, 3, 8),
    ('MARIA', 10, 5, 10),
    ('DIEGO', 29, 4, 17),
    ('ARIANNA', 4, 0, 11),
    ('ANTONELLA', 0, 0, 0),
    ('CAROLINA', 14, 11, 3),
    ('DIANA F', 2, 0, 1),
    ('SAMANTHA', 34, 3, 22),
    ('ERICK', 3, 0, 1),
    ('DANIELA', 7, 3, 5),
    ('ESTHER', 0, 0, 0),
    ('STIVEN', 0, 0, 0)
),
missing_executives as (
  select s.executive_name
  from source s
  where (s.c_qty + s.cm_qty + s.d_qty) > 0
    and not exists (
      select 1
      from public.executives e
      where lower(replace(trim(e.full_name), '.', '')) = lower(replace(trim(s.executive_name), '.', ''))
    )
)
insert into public.executives(code, full_name, shift, status)
select
  'IMP-' || upper(substr(md5(executive_name), 1, 6)),
  executive_name,
  'Importado',
  'activo'
from missing_executives
on conflict (code) do update set
  full_name = excluded.full_name,
  status = 'activo';

with import_team as (
  select id
  from public.teams
  where lower(name) = lower('Equipo por asignar - Importacion')
  limit 1
),
ranked_executives as (
  select e.id
  from public.executives e
  where exists (
    select 1
    from (
      values
        ('MARIANA'), ('ELIANA'), ('DAYELI'), ('ALEXANDRA'), ('BONNIE'),
        ('ANA GABRIELA'), ('PATT'), ('BRIAN'), ('MILUSKA'), ('RENATO'),
        ('KEVIN'), ('ANAROSA'), ('MARIA'), ('DIEGO'), ('ARIANNA'),
        ('ANTONELLA'), ('CAROLINA'), ('DIANA F'), ('SAMANTHA'), ('ERICK'),
        ('DANIELA'), ('ESTHER'), ('STIVEN')
    ) as names(executive_name)
    where lower(replace(trim(e.full_name), '.', '')) = lower(replace(trim(names.executive_name), '.', ''))
  )
)
insert into public.team_members(team_id, executive_id, start_date, active)
select import_team.id, ranked_executives.id, date '2026-06-01', true
from ranked_executives
cross join import_team
where not exists (
  select 1
  from public.team_members tm
  where tm.executive_id = ranked_executives.id
    and tm.active = true
);

do $$
declare
  sales_net_amount_is_generated boolean;
begin
  select coalesce(attgenerated <> '', false)
  into sales_net_amount_is_generated
  from pg_attribute
  where attrelid = 'public.sales'::regclass
    and attname = 'net_amount'
    and not attisdropped;

  if sales_net_amount_is_generated then
    execute $sql$
      with source(executive_name, c_qty, cm_qty, d_qty) as (
        values
          ('MARIANA', 39, 11, 21), ('ELIANA', 93, 7, 32), ('DAYELI', 0, 0, 0),
          ('ALEXANDRA', 41, 3, 13), ('BONNIE', 1, 0, 1), ('ANA GABRIELA', 2, 1, 1),
          ('PATT', 0, 0, 0), ('BRIAN', 1, 0, 0), ('MILUSKA', 0, 0, 0),
          ('RENATO', 1, 0, 0), ('KEVIN', 30, 3, 7), ('ANAROSA', 20, 3, 8),
          ('MARIA', 10, 5, 10), ('DIEGO', 29, 4, 17), ('ARIANNA', 4, 0, 11),
          ('ANTONELLA', 0, 0, 0), ('CAROLINA', 14, 11, 3), ('DIANA F', 2, 0, 1),
          ('SAMANTHA', 34, 3, 22), ('ERICK', 3, 0, 1), ('DANIELA', 7, 3, 5),
          ('ESTHER', 0, 0, 0), ('STIVEN', 0, 0, 0)
      ),
      expanded as (
        select executive_name, 'C'::text as product_code, c_qty as quantity, 1::numeric as unit_amount from source
        union all select executive_name, 'CM'::text, cm_qty, 2::numeric from source
        union all select executive_name, 'D'::text, d_qty, 6::numeric from source
      ),
      admin_profile as (
        select id
        from public.profiles
        order by
          case when role = 'admin_sistema' then 0 when role in ('gerencia', 'jefe_ventas') then 1 else 2 end,
          created_at asc
        limit 1
      ),
      resolved as (
        select expanded.*, e.id as executive_id, coalesce(tm.team_id, fallback_team.id) as team_id, pt.id as product_type_id, admin_profile.id as user_id
        from expanded
        join public.executives e on lower(replace(trim(e.full_name), '.', '')) = lower(replace(trim(expanded.executive_name), '.', ''))
        join public.product_types pt on pt.code = expanded.product_code
        left join lateral (
          select team_id from public.team_members where executive_id = e.id and active = true order by start_date desc limit 1
        ) tm on true
        left join lateral (
          select id from public.teams where lower(name) = lower('Equipo por asignar - Importacion') limit 1
        ) fallback_team on true
        cross join admin_profile
        where expanded.quantity > 0
      )
      insert into public.sales (
        sale_date, executive_id, team_id, product_type_id, product_id, quantity, gross_amount, discount_amount,
        payment_method, lead_source, validation_status, notes, created_by, validated_by, validated_at, source_key
      )
      select
        date '2026-06-12', executive_id, team_id, product_type_id, null, quantity, quantity * unit_amount, 0,
        'No especificado', 'Otro', 'validada',
        'Carga historica acumulada Junio 2026 desde ranking: ' || executive_name || ' - ' || product_code,
        user_id, user_id, now(),
        'ranking-junio-2026-mtd|' || lower(replace(trim(executive_name), ' ', '-')) || '|' || product_code
      from resolved
      on conflict (source_key) where source_key is not null do update set
        quantity = excluded.quantity,
        gross_amount = excluded.gross_amount,
        discount_amount = excluded.discount_amount,
        validation_status = 'validada',
        validated_by = excluded.validated_by,
        validated_at = now(),
        notes = excluded.notes;
    $sql$;
  else
    execute $sql$
      with source(executive_name, c_qty, cm_qty, d_qty) as (
        values
          ('MARIANA', 39, 11, 21), ('ELIANA', 93, 7, 32), ('DAYELI', 0, 0, 0),
          ('ALEXANDRA', 41, 3, 13), ('BONNIE', 1, 0, 1), ('ANA GABRIELA', 2, 1, 1),
          ('PATT', 0, 0, 0), ('BRIAN', 1, 0, 0), ('MILUSKA', 0, 0, 0),
          ('RENATO', 1, 0, 0), ('KEVIN', 30, 3, 7), ('ANAROSA', 20, 3, 8),
          ('MARIA', 10, 5, 10), ('DIEGO', 29, 4, 17), ('ARIANNA', 4, 0, 11),
          ('ANTONELLA', 0, 0, 0), ('CAROLINA', 14, 11, 3), ('DIANA F', 2, 0, 1),
          ('SAMANTHA', 34, 3, 22), ('ERICK', 3, 0, 1), ('DANIELA', 7, 3, 5),
          ('ESTHER', 0, 0, 0), ('STIVEN', 0, 0, 0)
      ),
      expanded as (
        select executive_name, 'C'::text as product_code, c_qty as quantity, 1::numeric as unit_amount from source
        union all select executive_name, 'CM'::text, cm_qty, 2::numeric from source
        union all select executive_name, 'D'::text, d_qty, 6::numeric from source
      ),
      admin_profile as (
        select id
        from public.profiles
        order by
          case when role = 'admin_sistema' then 0 when role in ('gerencia', 'jefe_ventas') then 1 else 2 end,
          created_at asc
        limit 1
      ),
      resolved as (
        select expanded.*, e.id as executive_id, coalesce(tm.team_id, fallback_team.id) as team_id, pt.id as product_type_id, admin_profile.id as user_id
        from expanded
        join public.executives e on lower(replace(trim(e.full_name), '.', '')) = lower(replace(trim(expanded.executive_name), '.', ''))
        join public.product_types pt on pt.code = expanded.product_code
        left join lateral (
          select team_id from public.team_members where executive_id = e.id and active = true order by start_date desc limit 1
        ) tm on true
        left join lateral (
          select id from public.teams where lower(name) = lower('Equipo por asignar - Importacion') limit 1
        ) fallback_team on true
        cross join admin_profile
        where expanded.quantity > 0
      )
      insert into public.sales (
        sale_date, executive_id, team_id, product_type_id, product_id, quantity, gross_amount, discount_amount,
        net_amount, payment_method, lead_source, validation_status, notes, created_by, validated_by, validated_at, source_key
      )
      select
        date '2026-06-12', executive_id, team_id, product_type_id, null, quantity, quantity * unit_amount, 0,
        quantity * unit_amount, 'No especificado', 'Otro', 'validada',
        'Carga historica acumulada Junio 2026 desde ranking: ' || executive_name || ' - ' || product_code,
        user_id, user_id, now(),
        'ranking-junio-2026-mtd|' || lower(replace(trim(executive_name), ' ', '-')) || '|' || product_code
      from resolved
      on conflict (source_key) where source_key is not null do update set
        quantity = excluded.quantity,
        gross_amount = excluded.gross_amount,
        discount_amount = excluded.discount_amount,
        net_amount = excluded.net_amount,
        validation_status = 'validada',
        validated_by = excluded.validated_by,
        validated_at = now(),
        notes = excluded.notes;
    $sql$;
  end if;
end $$;

commit;

select
  count(*) as ventas_importadas_o_actualizadas,
  sum(quantity) as productos_importados,
  sum(net_amount) as monto_ganado_importado
from public.sales
where source_key like 'ranking-junio-2026-mtd|%';
