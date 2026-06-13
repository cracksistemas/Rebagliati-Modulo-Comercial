create table if not exists public.kommo_webhook_debug (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  content_type text null,
  body_received boolean not null default false,
  top_level_keys text[] not null default '{}',
  detected_records integer not null default 0,
  normalized_events integer not null default 0,
  persisted_events integer not null default 0,
  table_missing boolean not null default false,
  supabase_error jsonb null,
  reason text not null,
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_kommo_webhook_debug_received_at
on public.kommo_webhook_debug (received_at desc);

alter table public.kommo_webhook_debug enable row level security;

drop policy if exists "kommo_webhook_debug_admin_read" on public.kommo_webhook_debug;
create policy "kommo_webhook_debug_admin_read"
on public.kommo_webhook_debug for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin_sistema', 'gerencia', 'jefe_ventas')
  )
);
