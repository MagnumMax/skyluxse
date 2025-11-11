create or replace function public.kommo_webhook_stats_view()
returns table (
  hour_total_events integer,
  hour_failed_events integer,
  hour_last_event_at timestamptz
)
language sql
as $$
  select
    coalesce(sum(total_events), 0) as hour_total_events,
    coalesce(sum(failed_events), 0) as hour_failed_events,
    max(last_event_at) as hour_last_event_at
  from public.kommo_webhook_stats
  where bucket_start >= date_trunc('hour', timezone('utc', now()))
    and bucket_start < date_trunc('hour', timezone('utc', now())) + interval '1 hour';
$$;
