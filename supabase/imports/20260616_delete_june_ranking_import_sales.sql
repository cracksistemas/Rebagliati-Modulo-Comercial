-- Retira del sistema la carga histórica importada desde el ranking de Junio 2026.
-- La tabla sales tiene una protección que impide borrado físico.
-- Por eso este script anula esas ventas y las deja sin impacto en ranking, metas y dashboard.

begin;

alter table public.sales
add column if not exists source_key text;

-- Mantenimiento puntual: el SQL Editor no llega con auth.uid() de jefe/admin,
-- por eso se desactiva solo la regla de cambio de estado durante esta transaccion.
alter table public.sales disable trigger sales_validation_rules;

do $$
declare
  sales_net_amount_is_generated boolean;
  affected_sales integer := 0;
begin
  create temp table tmp_june_import_sales on commit drop as
  select id
  from public.sales
  where source_key like 'ranking-junio-2026-mtd|%'
     or notes ilike 'Carga historica acumulada Junio 2026 desde ranking:%';

  select coalesce(attgenerated <> '', false)
  into sales_net_amount_is_generated
  from pg_attribute
  where attrelid = 'public.sales'::regclass
    and attname = 'net_amount'
    and not attisdropped;

  if sales_net_amount_is_generated then
    update public.sales
    set
      gross_amount = 0,
      discount_amount = 0,
      validation_status = 'anulada',
      annulment_reason = 'Retiro de carga historica Junio 2026. Se usara Excel hasta el inicio oficial de carga en sistema.',
      payment_method = 'No especificado',
      lead_source = 'Importacion retirada',
      notes = case
        when notes ilike 'Carga historica acumulada Junio 2026 desde ranking:%'
          then notes || E'\nRetirada del sistema por decision operativa: se usara Excel hasta el inicio oficial de carga en sistema.'
        else 'Carga historica acumulada Junio 2026 desde ranking: retirada del sistema por decision operativa.'
      end
    where id in (select id from tmp_june_import_sales);
  else
    update public.sales
    set
      gross_amount = 0,
      discount_amount = 0,
      net_amount = 0,
      validation_status = 'anulada',
      annulment_reason = 'Retiro de carga historica Junio 2026. Se usara Excel hasta el inicio oficial de carga en sistema.',
      payment_method = 'No especificado',
      lead_source = 'Importacion retirada',
      notes = case
        when notes ilike 'Carga historica acumulada Junio 2026 desde ranking:%'
          then notes || E'\nRetirada del sistema por decision operativa: se usara Excel hasta el inicio oficial de carga en sistema.'
        else 'Carga historica acumulada Junio 2026 desde ranking: retirada del sistema por decision operativa.'
      end
    where id in (select id from tmp_june_import_sales);
  end if;

  get diagnostics affected_sales = row_count;

  if to_regclass('public.sale_payments') is not null then
    update public.sale_payments
    set
      expected_amount = 0,
      paid_amount = 0,
      payment_status = 'Anulado por retiro de carga historica',
      observation = 'Retiro de carga historica Junio 2026. Se usara Excel hasta el inicio oficial del sistema.'
    where sale_id in (select id from tmp_june_import_sales);
  end if;

  if to_regclass('public.sale_payment_plan') is not null then
    update public.sale_payment_plan
    set
      total_program_amount = 0,
      paid_amount = 0,
      pending_amount = 0
    where sale_id in (select id from tmp_june_import_sales);
  end if;

  raise notice 'Ventas historicas importadas anuladas: %', affected_sales;
end $$;

alter table public.sales enable trigger sales_validation_rules;

commit;

select
  count(*) as ventas_historicas_preservadas,
  count(*) filter (
    where validation_status <> 'anulada'
       or coalesce(gross_amount, 0) <> 0
       or coalesce(net_amount, 0) <> 0
  ) as ventas_historicas_con_impacto,
  coalesce(sum(net_amount), 0) as monto_historico_conservado
from public.sales
where source_key like 'ranking-junio-2026-mtd|%'
   or notes ilike 'Carga historica acumulada Junio 2026 desde ranking:%';
