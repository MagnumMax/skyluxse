create or replace function public.run_kommo_full_refresh(p_run_id uuid)
returns void
language plpgsql
as $$
declare
  v_leads_count integer;
  v_contacts_count integer;
  v_prev_count integer;
  v_drop_threshold numeric := 0.7;
begin
  select count(*) into v_leads_count from public.stg_kommo_leads where run_id = p_run_id;
  if v_leads_count = 0 then
    raise exception 'No staged Kommo leads for run %', p_run_id;
  end if;

  select count(*) into v_contacts_count from public.stg_kommo_contacts where run_id = p_run_id;

  select leads_count into v_prev_count
  from public.kommo_import_runs
  where status = 'succeeded'
    and id <> p_run_id
  order by finished_at desc
  limit 1;

  if v_prev_count is not null and v_prev_count > 0 and v_leads_count < (v_prev_count * v_drop_threshold) then
    raise exception 'Kommo import aborted: leads dropped from % to %', v_prev_count, v_leads_count;
  end if;

  perform pg_advisory_xact_lock(90902);

  delete from public.sales_leads where lead_code like 'kommo:%';
  delete from public.bookings where channel ilike 'kommo' and source_payload_id is not null;

  with staged as (
    select distinct on (contact_id)
      contact_id::text as kommo_contact_id,
      coalesce(payload->>'name', 'Kommo Contact ' || contact_id) as name
    from public.stg_kommo_contacts
    where run_id = p_run_id
    order by contact_id
  )
  insert into public.clients(kommo_contact_id, name, updated_at)
  select kommo_contact_id, name, timezone('utc', now())
  from staged
  on conflict (kommo_contact_id) do update set
    name = excluded.name,
    updated_at = timezone('utc', now());

  with lead_stage as (
    select
      l.lead_id,
      l.contact_id::text as kommo_contact_id,
      coalesce((l.payload->>'price')::numeric, 0) as price,
      l.kommo_created_at,
      l.kommo_updated_at
    from public.stg_kommo_leads l
    where l.run_id = p_run_id
  ), resolved as (
    select ls.lead_id,
           ls.price,
          ls.kommo_created_at,
           ls.kommo_updated_at,
           c.id as client_id
    from lead_stage ls
    left join public.clients c on c.kommo_contact_id = ls.kommo_contact_id
  )
  insert into public.sales_leads(lead_code, client_id, value_amount, created_at, updated_at)
  select 'kommo:' || lead_id,
         client_id,
         price,
         coalesce(kommo_created_at, timezone('utc', now())),
         coalesce(kommo_updated_at, timezone('utc', now()))
  from resolved
  on conflict (lead_code) do update set
    client_id = excluded.client_id,
    value_amount = excluded.value_amount,
    updated_at = excluded.updated_at;

  with booking_stage as (
    select
      l.lead_id,
      coalesce((l.payload->>'price')::numeric, 0) as price,
      l.kommo_created_at,
      l.kommo_updated_at,
      c.id as client_id
    from public.stg_kommo_leads l
    left join public.clients c on c.kommo_contact_id = l.contact_id::text
    where l.run_id = p_run_id
  )
  insert into public.bookings (external_code, client_id, total_amount, deposit_amount, source_payload_id, created_at, updated_at, channel)
  select 'K-' || lead_id,
         client_id,
         price,
         0,
         'kommo:' || lead_id,
         coalesce(kommo_created_at, timezone('utc', now())),
         coalesce(kommo_updated_at, timezone('utc', now())),
         'kommo'
  from booking_stage
  on conflict (source_payload_id) do update set
    client_id = excluded.client_id,
    total_amount = excluded.total_amount,
    updated_at = excluded.updated_at;

  update public.kommo_import_runs
  set leads_count = v_leads_count,
      contacts_count = v_contacts_count,
      vehicles_count = (
        select coalesce(count(distinct vehicle_enum_id), 0)
        from public.stg_kommo_booking_vehicles
        where run_id = p_run_id
      )
  where id = p_run_id;

  perform pg_advisory_unlock(90902);
end;
$$;
