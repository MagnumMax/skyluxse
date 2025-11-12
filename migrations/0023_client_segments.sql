-- Extend client_segment enum with new lifecycle-based segments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'client_segment' AND e.enumlabel = 'premier_loyalist'
  ) THEN
    ALTER TYPE public.client_segment ADD VALUE 'premier_loyalist';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'client_segment' AND e.enumlabel = 'dormant_vip'
  ) THEN
    ALTER TYPE public.client_segment ADD VALUE 'dormant_vip';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'client_segment' AND e.enumlabel = 'growth_gold'
  ) THEN
    ALTER TYPE public.client_segment ADD VALUE 'growth_gold';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'client_segment' AND e.enumlabel = 'at_risk'
  ) THEN
    ALTER TYPE public.client_segment ADD VALUE 'at_risk';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'client_segment' AND e.enumlabel = 'new_rising'
  ) THEN
    ALTER TYPE public.client_segment ADD VALUE 'new_rising';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'client_segment' AND e.enumlabel = 'high_value_dormant'
  ) THEN
    ALTER TYPE public.client_segment ADD VALUE 'high_value_dormant';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'client_segment' AND e.enumlabel = 'general'
  ) THEN
    ALTER TYPE public.client_segment ADD VALUE 'general';
  END IF;
END$$;

create or replace function public.calculate_client_last_booking_at(p_client_id uuid)
returns timestamptz
language sql
stable
as $$
  select max(coalesce(b.end_at, b.start_at, b.updated_at, b.created_at))
  from public.bookings b
  where b.client_id = p_client_id;
$$;

create or replace function public.calc_client_segment_from_metrics(
  p_tier client_tier,
  p_lifetime_value numeric,
  p_last_booking timestamptz
)
returns client_segment
language plpgsql
immutable
as $$
declare
  age_days numeric := case
    when p_last_booking is null then 1e9
    else extract(epoch from (timezone('utc', now()) - p_last_booking)) / 86400
  end;
begin
  if p_tier = 'vip' and age_days <= 30 then
    return 'premier_loyalist';
  elsif p_tier = 'vip' and age_days > 60 then
    return 'dormant_vip';
  elsif p_tier = 'gold' and age_days <= 45 then
    return 'growth_gold';
  elsif p_tier in ('gold', 'silver') and age_days > 90 then
    return 'at_risk';
  elsif p_tier = 'silver' and age_days <= 30 and coalesce(p_lifetime_value, 0) < 15000 then
    return 'new_rising';
  elsif coalesce(p_lifetime_value, 0) >= 35000 and age_days > 45 then
    return 'high_value_dormant';
  else
    return 'general';
  end if;
end;
$$;

create or replace function public.refresh_client_metrics_for_ids(p_client_ids uuid[])
returns void
language plpgsql
as $$
declare
  ids uuid[];
begin
  if p_client_ids is null then
    return;
  end if;

  select array_agg(distinct cid) into ids
  from unnest(p_client_ids) as t(cid)
  where cid is not null;

  if ids is null or array_length(ids, 1) is null then
    return;
  end if;

  update public.clients c
  set tier = metrics.new_tier,
      segment = metrics.new_segment
  from (
    select data.id,
           data.ltv,
           data.last_booking,
           public.calc_client_tier_from_ltv(data.ltv) as new_tier,
           public.calc_client_segment_from_metrics(public.calc_client_tier_from_ltv(data.ltv), data.ltv, data.last_booking) as new_segment
    from (
      select c.id,
             public.calculate_client_lifetime_value(c.id) as ltv,
             public.calculate_client_last_booking_at(c.id) as last_booking
      from public.clients c
      where c.id = any(ids)
    ) as data
  ) as metrics
  where c.id = metrics.id;
end;
$$;

create or replace function public.refresh_client_metrics_for_client(p_client_id uuid)
returns void
language plpgsql
as $$
begin
  perform public.refresh_client_metrics_for_ids(array[p_client_id]);
end;
$$;

create or replace function public.refresh_client_tier_from_booking()
returns trigger
language plpgsql
as $$
declare
  ids uuid[] := ARRAY[]::uuid[];
begin
  if tg_op in ('UPDATE', 'DELETE') and old.client_id is not null then
    ids := array_append(ids, old.client_id);
  end if;
  if tg_op in ('UPDATE', 'INSERT') and new.client_id is not null then
    ids := array_append(ids, new.client_id);
  end if;

  perform public.refresh_client_metrics_for_ids(ids);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bookings_refresh_client_tier on public.bookings;
create trigger trg_bookings_refresh_client_tier
  after insert or update or delete on public.bookings
  for each row execute function public.refresh_client_tier_from_booking();
