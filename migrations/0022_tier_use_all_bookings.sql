create or replace function public.calculate_client_lifetime_value(p_client_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(coalesce(b.total_amount, 0)), 0)
  from public.bookings b
  where b.client_id = p_client_id;
$$;
