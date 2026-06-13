alter table public.kommo_message_events
  alter column message_created_at drop not null;

create index if not exists idx_kommo_message_events_effective_created_at
on public.kommo_message_events ((coalesce(message_created_at, received_at)));

create index if not exists idx_kommo_message_events_talk_effective
on public.kommo_message_events (talk_id, (coalesce(message_created_at, received_at)));

create index if not exists idx_kommo_message_events_lead_effective
on public.kommo_message_events (lead_id, (coalesce(message_created_at, received_at)));

create or replace view public.v_kommo_message_events_for_metrics as
select
  id,
  message_id,
  lead_id,
  talk_id,
  contact_id,
  conversation_id,
  channel,
  source,
  direction,
  sender_user_id,
  sender_name,
  responsible_user_id,
  responsible_user_name,
  message_created_at,
  received_at,
  coalesce(message_created_at, received_at) as effective_created_at,
  raw_payload
from public.kommo_message_events;

grant select on public.v_kommo_message_events_for_metrics to authenticated;
