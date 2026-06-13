alter table public.kommo_webhook_debug
  add column if not exists raw_body text null;
