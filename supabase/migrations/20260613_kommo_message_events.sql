create table if not exists public.kommo_message_events (
  id uuid primary key default gen_random_uuid(),
  message_id text not null unique,
  lead_id bigint null,
  talk_id bigint null,
  contact_id bigint null,
  conversation_id text null,
  channel text null,
  source text null,
  direction text not null check (direction in ('incoming', 'outgoing')),
  sender_user_id text null,
  sender_name text null,
  responsible_user_id text null,
  responsible_user_name text null,
  message_created_at timestamptz not null,
  raw_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists idx_kommo_message_events_created_at
on public.kommo_message_events (message_created_at);

create index if not exists idx_kommo_message_events_talk_created
on public.kommo_message_events (talk_id, message_created_at);

create index if not exists idx_kommo_message_events_lead_created
on public.kommo_message_events (lead_id, message_created_at);

create index if not exists idx_kommo_message_events_direction
on public.kommo_message_events (direction);

alter table public.kommo_message_events enable row level security;

drop policy if exists "kommo_message_events_admin_read" on public.kommo_message_events;
create policy "kommo_message_events_admin_read"
on public.kommo_message_events for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin_sistema', 'gerencia', 'jefe_ventas')
  )
);
