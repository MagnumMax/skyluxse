create or replace function public.extract_kommo_epoch(payload jsonb, target_field_id bigint)
returns timestamptz
language sql
immutable
as $$
  select to_timestamp(value_txt::double precision)
  from (
    select value_elem->>'value' as value_txt
    from jsonb_array_elements(
      case when jsonb_typeof(payload->'custom_fields_values') = 'array'
        then payload->'custom_fields_values'
        else '[]'::jsonb
      end
    ) as cf
    cross join jsonb_array_elements(
      case when jsonb_typeof(cf->'values') = 'array'
        then cf->'values'
        else '[]'::jsonb
      end
    ) as value_elem
    where (cf->>'field_id')::bigint = target_field_id
    limit 1
  ) as matched
  where matched.value_txt is not null
$$;

drop view if exists public.calendar_events_expanded;

create view public.calendar_events_expanded as
select
  ce.id,
  ce.vehicle_id,
  ce.booking_id,
  ce.event_type,
  ce.start_at,
  ce.end_at,
  ce.status
from public.calendar_events ce

union all

select
  b.id as id,
  b.vehicle_id,
  b.id as booking_id,
  'booking'::calendar_event_type as event_type,
  coalesce(b.start_at, b.end_at) as start_at,
  greatest(
    coalesce(b.end_at, b.start_at),
    coalesce(b.start_at, b.end_at)
  ) as end_at,
  case b.status
    when 'in_progress' then 'in_progress'::event_status
    when 'completed' then 'done'::event_status
    when 'cancelled' then 'cancelled'::event_status
    else 'scheduled'::event_status
  end as status
from public.bookings b
where b.vehicle_id is not null
  and (b.start_at is not null or b.end_at is not null);

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
      l.kommo_updated_at,
      c.id as client_id
    from public.stg_kommo_leads l
    left join public.clients c on c.kommo_contact_id = l.contact_id::text
    where l.run_id = p_run_id
  ), resolved as (
    select ls.lead_id,
           ls.price,
           ls.kommo_created_at,
           ls.kommo_updated_at,
           ls.client_id
    from lead_stage ls
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

  with vehicle_links as (
    select distinct on (bv.lead_id)
      bv.lead_id,
      v.id as vehicle_id
    from public.stg_kommo_booking_vehicles bv
    left join public.vehicles v on v.kommo_vehicle_id = bv.vehicle_enum_id::text
    where bv.run_id = p_run_id
    order by bv.lead_id, bv.created_at
  ), booking_stage as (
    select
      l.lead_id,
      coalesce((l.payload->>'price')::numeric, 0) as price,
      l.kommo_created_at,
      l.kommo_updated_at,
      c.id as client_id,
      vl.vehicle_id,
      coalesce(public.extract_kommo_epoch(l.payload, 1218176::bigint), public.extract_kommo_epoch(l.payload, 1218178::bigint)) as start_at,
      public.extract_kommo_epoch(l.payload, 1218178::bigint) as end_at
    from public.stg_kommo_leads l
    left join public.clients c on c.kommo_contact_id = l.contact_id::text
    left join vehicle_links vl on vl.lead_id = l.lead_id
    where l.run_id = p_run_id
  )
  insert into public.bookings (
    external_code,
    client_id,
    vehicle_id,
    total_amount,
    deposit_amount,
    source_payload_id,
    start_at,
    end_at,
    created_at,
    updated_at,
    channel
  )
  select 'K-' || lead_id,
         client_id,
         vehicle_id,
         price,
         0,
         'kommo:' || lead_id,
         start_at,
         coalesce(end_at, start_at),
         coalesce(kommo_created_at, timezone('utc', now())),
         coalesce(kommo_updated_at, timezone('utc', now())),
         'kommo'
  from booking_stage
  on conflict (source_payload_id) do update set
    client_id = excluded.client_id,
    vehicle_id = excluded.vehicle_id,
    total_amount = excluded.total_amount,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
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

do $$
declare
  v_last_run uuid;
begin
  select id into v_last_run
  from public.kommo_import_runs
  where status = 'succeeded'
  order by finished_at desc
  limit 1;

  if v_last_run is not null then
    perform public.run_kommo_full_refresh(v_last_run);
  end if;
end $$;
