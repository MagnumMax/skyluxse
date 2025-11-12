create or replace function public.calculate_vehicle_utilization(
  p_vehicle_id uuid,
  p_reference timestamptz default now(),
  p_window_days integer default 30
)
returns numeric
language sql
stable
as $$
  with params as (
    select
      p_reference as ref_ts,
      p_reference - (p_window_days || ' days')::interval as window_start
  ), booking_windows as (
    select
      greatest(b.start_at, params.window_start) as overlap_start,
      least(b.end_at, params.ref_ts) as overlap_end,
      params.ref_ts,
      params.window_start
    from public.bookings b
    cross join params
    where b.vehicle_id = p_vehicle_id
      and b.start_at is not null
      and b.end_at is not null
      and least(b.end_at, params.ref_ts) > greatest(b.start_at, params.window_start)
  )
  select coalesce(
    least(
      1,
      greatest(
        0,
        coalesce(sum(extract(epoch from booking_windows.overlap_end - booking_windows.overlap_start)), 0)
        / nullif(max(extract(epoch from params.ref_ts - params.window_start)), 0)
      )
    ),
    0
  )
  from params
  left join booking_windows on true;
$$;

create or replace function public.refresh_vehicle_utilization(p_vehicle_id uuid)
returns void
language plpgsql
as $$
begin
  if p_vehicle_id is null then
    return;
  end if;

  update public.vehicles v
  set utilization_pct = public.calculate_vehicle_utilization(v.id)
  where v.id = p_vehicle_id;
end;
$$;

create or replace function public.refresh_vehicle_utilization_from_booking()
returns trigger
language plpgsql
as $$
declare
  affected_vehicle_ids uuid[] := array(
    select distinct vid from (values (old.vehicle_id), (new.vehicle_id)) as t(vid)
    where vid is not null
  );
begin
  if affected_vehicle_ids is null or array_length(affected_vehicle_ids, 1) is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  update public.vehicles v
  set utilization_pct = public.calculate_vehicle_utilization(v.id)
  where v.id = any(affected_vehicle_ids);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bookings_refresh_vehicle_utilization on public.bookings;
create trigger trg_bookings_refresh_vehicle_utilization
  after insert or update or delete on public.bookings
  for each row execute function public.refresh_vehicle_utilization_from_booking();

-- Backfill
update public.vehicles v
set utilization_pct = public.calculate_vehicle_utilization(v.id);
