drop trigger if exists trg_kommo_webhook_stats on public.kommo_webhook_events;

drop function if exists public.bump_kommo_webhook_stats() cascade;

create or replace function public.bump_kommo_webhook_stats()
returns trigger
language plpgsql
as $$
declare
  v_bucket timestamptz;
  v_type text := 'lead_status';
  v_is_failed boolean := (new.status = 'failed');
begin
  v_bucket := date_trunc('hour', coalesce(new.created_at, timezone('utc', now())));

  insert into public.kommo_webhook_stats(bucket_start, event_type, total_events, processed_events, failed_events, last_event_at)
  values (v_bucket, v_type, 1, case when v_is_failed then 0 else 1 end, case when v_is_failed then 1 else 0 end, new.created_at)
  on conflict (bucket_start, event_type) do update
    set total_events = public.kommo_webhook_stats.total_events + 1,
        processed_events = public.kommo_webhook_stats.processed_events + (case when v_is_failed then 0 else 1 end),
        failed_events = public.kommo_webhook_stats.failed_events + (case when v_is_failed then 1 else 0 end),
        last_event_at = greatest(public.kommo_webhook_stats.last_event_at, new.created_at);
  return new;
end;
$$;

create trigger trg_kommo_webhook_stats
  after insert on public.kommo_webhook_events
  for each row execute procedure public.bump_kommo_webhook_stats();

create or replace function public.kommo_webhook_summary()
returns table (
  last_event_at timestamptz,
  events_today integer,
  events_failed integer,
  last_status text
)
language sql
stable
as $$
  with latest as (
    select created_at, status
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
    (select status from latest) as last_status;
$$;

create or replace function public.kommo_webhook_stats_view()
returns table (
  hour_total_events integer,
  hour_failed_events integer,
  hour_last_event_at timestamptz
)
language sql
stable
as $$
  select
    coalesce(sum(total_events), 0) as hour_total_events,
    coalesce(sum(failed_events), 0) as hour_failed_events,
    max(last_event_at) as hour_last_event_at
  from public.kommo_webhook_stats
  where bucket_start >= date_trunc('hour', timezone('utc', now()))
    and bucket_start < date_trunc('hour', timezone('utc', now())) + interval '1 hour';
$$;
