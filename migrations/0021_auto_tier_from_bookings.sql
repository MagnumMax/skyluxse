create or replace function public.calculate_client_lifetime_value(p_client_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(coalesce(b.total_amount, 0)), 0)
  from public.bookings b
  where b.client_id = p_client_id
    and b.status <> 'lead';
$$;

create or replace function public.calc_client_tier_from_ltv(p_lifetime_value numeric)
returns client_tier
language sql
immutable
as $$
  select case
    when coalesce(p_lifetime_value, 0) >= 50000 then 'vip'::client_tier
    when coalesce(p_lifetime_value, 0) >= 35000 then 'gold'::client_tier
    when coalesce(p_lifetime_value, 0) < 15000 then 'silver'::client_tier
    else 'silver'::client_tier
  end;
$$;

create or replace function public.refresh_client_tier_for_client(p_client_id uuid)
returns void
language plpgsql
as $$
begin
  update public.clients c
  set tier = public.calc_client_tier_from_ltv(public.calculate_client_lifetime_value(c.id))
  where c.id = p_client_id;
end;
$$;

create or replace function public.refresh_client_tier_from_booking()
returns trigger
language plpgsql
as $$
declare
  affected_clients uuid[] := array(select distinct cid from (values (old.client_id), (new.client_id)) as t(cid) where cid is not null);
begin
  if affected_clients is not null then
    update public.clients c
    set tier = public.calc_client_tier_from_ltv(public.calculate_client_lifetime_value(c.id))
    where c.id = any(affected_clients);
  end if;

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
