create or replace function public.normalize_gender_label(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null or btrim(value) = '' then null
    when lower(value) in ('male','m','man') then 'Male'
    when lower(value) in ('female','f','woman') then 'Female'
    else initcap(value)
  end;
$$;

create or replace function public.normalize_country_label(value text)
returns text
language plpgsql
immutable
as $$
declare
  trimmed text := nullif(btrim(value), '');
  lower_trim text;
begin
  if trimmed is null then
    return null;
  end if;
  lower_trim := lower(trimmed);
  if trimmed ~ '^[A-Za-z]{2}$' then
    return upper(trimmed);
  end if;
  case lower_trim
    when 'uae' then return 'AE';
    when 'united arab emirates' then return 'AE';
    when 'emirates' then return 'AE';
    when 'dubai' then return 'AE';
    when 'russia' then return 'RU';
    when 'russian' then return 'RU';
    when 'russian federation' then return 'RU';
    when 'ukraine' then return 'UA';
    when 'kazakhstan' then return 'KZ';
    when 'belarus' then return 'BY';
    when 'india' then return 'IN';
    when 'pakistan' then return 'PK';
    when 'saudi arabia' then return 'SA';
    when 'ksa' then return 'SA';
    when 'qatar' then return 'QA';
    when 'kuwait' then return 'KW';
    when 'oman' then return 'OM';
    when 'bahrain' then return 'BH';
    when 'usa' then return 'US';
    when 'united states' then return 'US';
    when 'united states of america' then return 'US';
    else return initcap(trimmed);
  end case;
end;
$$;

create or replace function public.extract_kommo_contact_field(p_payload jsonb, p_target text)
returns text
language plpgsql
immutable
as $$
declare
  target text := lower(coalesce(p_target, ''));
  fields jsonb := coalesce(p_payload->'custom_fields_values', '[]'::jsonb);
  field jsonb;
  entry jsonb;
  field_code text;
  field_label text;
  candidate text;
  preferred text;
begin
  if p_payload is null or target = '' then
    return null;
  end if;

  if target in ('phone','email') then
    for field in select * from jsonb_array_elements(fields)
    loop
      field_code := upper(coalesce(field->>'code', field->>'field_code', ''));
      if (target = 'phone' and field_code = 'PHONE') or (target = 'email' and field_code = 'EMAIL') then
        for entry in select * from jsonb_array_elements(coalesce(field->'values', '[]'::jsonb))
        loop
          candidate := nullif(btrim(entry->>'value'), '');
          if candidate is null then
            continue;
          end if;
          if target = 'email' then
            return candidate;
          end if;
          if preferred is null then
            preferred := candidate;
          end if;
          if upper(coalesce(entry->>'enum_code', '')) in ('MOB','MOBILE','MOBILE_PHONE','PRIMARY') then
            return candidate;
          end if;
        end loop;
      end if;
    end loop;
    return preferred;
  elsif target in ('nationality','gender') then
    for field in select * from jsonb_array_elements(fields)
    loop
      field_label := lower(coalesce(field->>'name', field->>'field_name', field->>'code', ''));
      if field_label = target then
        for entry in select * from jsonb_array_elements(coalesce(field->'values', '[]'::jsonb))
        loop
          candidate := nullif(btrim(entry->>'value'), '');
          if candidate is not null then
            return candidate;
          end if;
        end loop;
      end if;
    end loop;
  end if;

  return null;
end;
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
  v_excluded_statuses constant bigint[] := array[79790631::bigint, 91703923::bigint, 143::bigint];
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
      coalesce(payload->>'name', 'Kommo Contact ' || contact_id) as name,
      public.extract_kommo_contact_field(payload, 'phone') as phone,
      public.extract_kommo_contact_field(payload, 'email') as email,
      public.normalize_country_label(public.extract_kommo_contact_field(payload, 'nationality')) as residency_country,
      public.normalize_gender_label(public.extract_kommo_contact_field(payload, 'gender')) as gender
    from public.stg_kommo_contacts
    where run_id = p_run_id
    order by contact_id
  )
  insert into public.clients(kommo_contact_id, name, phone, email, residency_country, gender, updated_at)
  select kommo_contact_id,
         name,
         phone,
         email,
         residency_country,
         gender,
         timezone('utc', now())
  from staged
  on conflict (kommo_contact_id) do update set
    name = excluded.name,
    phone = coalesce(excluded.phone, public.clients.phone),
    email = coalesce(excluded.email, public.clients.email),
    residency_country = coalesce(excluded.residency_country, public.clients.residency_country),
    gender = coalesce(excluded.gender, public.clients.gender),
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

  with valid_booking_leads as (
    select
      l.*,
      (l.payload->>'status_id')::bigint as kommo_status_id
    from public.stg_kommo_leads l
    where l.run_id = p_run_id
      and coalesce((l.payload->>'status_id')::bigint, 0) <> all (v_excluded_statuses)
  ), vehicle_links as (
    select distinct on (bv.lead_id)
      bv.lead_id,
      v.id as vehicle_id
    from public.stg_kommo_booking_vehicles bv
    join valid_booking_leads vl on vl.lead_id = bv.lead_id
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
      public.extract_kommo_epoch(l.payload, 1218178::bigint) as end_at,
      l.kommo_status_id
    from valid_booking_leads l
    left join public.clients c on c.kommo_contact_id = l.contact_id::text
    left join vehicle_links vl on vl.lead_id = l.lead_id
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
    channel,
    kommo_status_id
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
         'kommo',
         kommo_status_id
  from booking_stage
  on conflict (source_payload_id) do update set
    client_id = excluded.client_id,
    vehicle_id = excluded.vehicle_id,
    total_amount = excluded.total_amount,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    updated_at = excluded.updated_at,
    kommo_status_id = excluded.kommo_status_id;

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
