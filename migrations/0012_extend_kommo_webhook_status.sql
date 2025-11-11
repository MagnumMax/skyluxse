alter table if exists public.kommo_webhook_events
  add column if not exists kommo_status_id text,
  add column if not exists kommo_status_label text;

create or replace function public.kommo_webhook_summary()
returns table (
  last_event_at timestamptz,
  events_today integer,
  events_failed integer,
  last_status text,
  last_status_id text,
  last_status_label text
)
language sql
stable
as $$
  with latest as (
    select created_at, status, kommo_status_id, kommo_status_label
    from public.kommo_webhook_events
    order by created_at desc
    limit 1
  )
  select
    (select max(created_at) from public.kommo_webhook_events) as last_event_at,
    coalesce(
      (select count(*) from public.kommo_webhook_events where created_at >= date_trunc('day', timezone('utc', now()))),
      0
    ) as events_today,
    coalesce(
      (select count(*) from public.kommo_webhook_events where created_at >= date_trunc('day', timezone('utc', now())) and status = 'failed'),
      0
    ) as events_failed,
    (select status from latest) as last_status,
    (select kommo_status_id from latest) as last_status_id,
    (select kommo_status_label from latest) as last_status_label;
$$;
