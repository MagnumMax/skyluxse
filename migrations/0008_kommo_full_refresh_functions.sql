-- RPC helpers + refresh pipeline for Kommo full refresh (10 Nov 2025)

alter table if exists public.clients
  add constraint if not exists clients_kommo_contact_unique unique (kommo_contact_id);

create or replace function public.start_kommo_import_run(p_triggered_by uuid)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
begin
  if not pg_try_advisory_lock(90901) then
    raise exception 'Kommo import already running';
  end if;

  insert into public.kommo_import_runs(triggered_by, status)
  values (p_triggered_by, 'running')
  returning id into v_run_id;

  return v_run_id;
end;
$$;

create or replace function public.finish_kommo_import_run(
  p_run_id uuid,
  p_status text,
  p_leads_count integer default null,
  p_contacts_count integer default null,
  p_vehicles_count integer default null,
  p_error text default null
)
returns void
language plpgsql
as $$
begin
  update public.kommo_import_runs
  set status = p_status,
      leads_count = coalesce(p_leads_count, leads_count),
      contacts_count = coalesce(p_contacts_count, contacts_count),
      vehicles_count = coalesce(p_vehicles_count, vehicles_count),
      error = p_error,
      finished_at = case when p_status in ('succeeded','failed','needs_review') then timezone('utc', now()) else finished_at end,
      updated_at = timezone('utc', now())
  where id = p_run_id;

  perform pg_advisory_unlock(90901);
end;
$$;

create or replace function public.insert_stg_kommo_lead(
  p_run_id uuid,
  p_lead_id bigint,
  p_contact_id bigint,
  p_vehicle_enum_id bigint,
  p_source_enum_id bigint,
  p_kommo_created_at timestamptz,
  p_kommo_updated_at timestamptz,
  p_payload jsonb
)
returns void
language sql
as $$
  insert into public.stg_kommo_leads(run_id, lead_id, contact_id, vehicle_enum_id, source_enum_id, kommo_created_at, kommo_updated_at, payload)
  values (p_run_id, p_lead_id, p_contact_id, p_vehicle_enum_id, p_source_enum_id, p_kommo_created_at, p_kommo_updated_at, p_payload)
  on conflict (run_id, lead_id) do update set
    contact_id = excluded.contact_id,
    vehicle_enum_id = excluded.vehicle_enum_id,
    source_enum_id = excluded.source_enum_id,
    kommo_created_at = excluded.kommo_created_at,
    kommo_updated_at = excluded.kommo_updated_at,
    payload = excluded.payload,
    updated_at = timezone('utc', now());
$$;

create or replace function public.insert_stg_kommo_contact(
  p_run_id uuid,
  p_contact_id bigint,
  p_payload jsonb
)
returns void
language sql
as $$
  insert into public.stg_kommo_contacts(run_id, contact_id, payload)
  values (p_run_id, p_contact_id, p_payload)
  on conflict (run_id, contact_id) do update set
    payload = excluded.payload,
    updated_at = timezone('utc', now());
$$;

create or replace function public.insert_stg_kommo_vehicle_link(
  p_run_id uuid,
  p_lead_id bigint,
  p_vehicle_enum_id bigint
)
returns void
language sql
as $$
  insert into public.stg_kommo_booking_vehicles(run_id, lead_id, vehicle_enum_id)
  values (p_run_id, p_lead_id, p_vehicle_enum_id)
  on conflict (run_id, lead_id, vehicle_enum_id) do update set
    updated_at = timezone('utc', now());
$$;

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

  -- Remove previous Kommo-derived rows
  delete from public.sales_leads where lead_code like 'kommo:%';
  delete from public.bookings where channel ilike 'kommo' and source_payload_id is not null;

  -- Upsert clients
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

  -- Upsert sales leads
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

  -- Upsert bookings snapshot
  insert into public.bookings (external_code, client_id, total_amount, deposit_amount, source_payload_id, created_at, updated_at, channel)
  select 'K-' || lead_id,
         client_id,
         price,
         0,
         'kommo:' || lead_id,
         coalesce(kommo_created_at, timezone('utc', now())),
         coalesce(kommo_updated_at, timezone('utc', now())),
         'kommo'
  from (
    select
      l.lead_id,
      l.price,
      l.kommo_created_at,
      l.kommo_updated_at,
      c.id as client_id
    from public.stg_kommo_leads l
    left join public.clients c on c.kommo_contact_id = l.contact_id::text
    where l.run_id = p_run_id
  ) as bookings_data
  on conflict (source_payload_id) do update set
    client_id = excluded.client_id,
    total_amount = excluded.total_amount,
    updated_at = excluded.updated_at;

  -- Update run stats
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
