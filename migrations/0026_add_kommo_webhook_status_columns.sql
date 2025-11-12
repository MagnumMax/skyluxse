alter table if exists public.kommo_webhook_events
  add column if not exists kommo_status_id text,
  add column if not exists kommo_status_label text;
