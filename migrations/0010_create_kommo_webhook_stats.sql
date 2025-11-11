create table if not exists public.kommo_webhook_stats (
    bucket_start timestamptz not null,
    event_type text not null default 'lead_status',
    total_events integer not null default 0,
    processed_events integer not null default 0,
    failed_events integer not null default 0,
    last_event_at timestamptz,
    primary key(bucket_start, event_type)
);

comment on table public.kommo_webhook_stats is 'Aggregated Kommo webhook metrics per hour/event type.';

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
