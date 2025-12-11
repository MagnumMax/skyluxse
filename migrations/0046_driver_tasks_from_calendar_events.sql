-- 2025-11-??: Auto-create driver tasks from calendar events within lead windows

-- Config table for JSON settings (lead hours, etc.)
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_system_settings_updated on public.system_settings;
create trigger trg_system_settings_updated
  before update on public.system_settings
  for each row execute function public.set_updated_at();

alter table public.system_settings enable row level security;

do $$
begin
  create policy "system settings read" on public.system_settings
    for select using (auth.role() in ('authenticated','service_role'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "system settings manage" on public.system_settings
    for all using (auth.role() = 'service_role');
exception
  when duplicate_object then null;
end $$;

insert into public.system_settings(key, value, description) values
  ('tasks.deliveryLeadHours', jsonb_build_object('hours', 12), 'Lead window (hours) for auto-creating delivery tasks from calendar events'),
  ('tasks.pickupLeadHours', jsonb_build_object('hours', 12), 'Lead window (hours) for auto-creating pickup tasks from calendar events')
on conflict (key) do nothing;

-- Helper to resolve lead hours with fallback
create or replace function public.get_task_lead_hours(setting_key text, default_hours int)
returns int
language plpgsql
stable
as $$
declare
  result int;
begin
  select coalesce((value->>'hours')::int, default_hours) into result
  from public.system_settings
  where key = setting_key;

  return coalesce(result, default_hours);
end;
$$;

-- Trigger function: create driver tasks from calendar events
create or replace function public.create_task_from_calendar_event()
returns trigger
language plpgsql
as $$
declare
  mode text;
  target_task_type task_type;
  lead_hours int;
  target_deadline timestamptz;
  utc_now timestamptz := timezone('utc', now());
  has_active boolean;
  delivery_location text;
  collect_location text;
  booking_client_id uuid;
  booking_driver_id uuid;
  geo jsonb;
  checklist jsonb;
  metadata_required_inputs jsonb;
  task_description text;
  task_title text;
  task_priority text;
begin
  mode := TG_ARGV[0];

  -- Require a linked booking to scope driver tasks
  if NEW.booking_id is null then
    return null;
  end if;

  select
    b.delivery_location,
    b.collect_location,
    b.client_id,
    b.driver_id
  into
    delivery_location,
    collect_location,
    booking_client_id,
    booking_driver_id
  from public.bookings b
  where b.id = NEW.booking_id;

  if mode = 'delivery' then
    target_task_type := 'delivery';
    target_deadline := NEW.start_at;
    task_priority := 'high';
    task_title := 'Delivery';
    task_description := 'Доставка авто клиенту';
    lead_hours := public.get_task_lead_hours('tasks.deliveryLeadHours', 12);
    geo := jsonb_build_object('pickup', collect_location, 'dropoff', delivery_location);
    metadata_required_inputs := jsonb_build_array(
      jsonb_build_object('key','odo_before','label','Odometer (before)','type','number','required',true),
      jsonb_build_object('key','fuel_before','label','Fuel/charge level (before)','type','select','required',true,'options',jsonb_build_array('Full','3/4','1/2','1/4','Empty')),
      jsonb_build_object('key','handover_photos','label','Handover photos','type','file','required',true,'multiple',true,'accept','image/*'),
      jsonb_build_object('key','signature','label','Signature / code','type','file','required',true,'multiple',false,'accept','image/*'),
      jsonb_build_object('key','damage_notes','label','Notes on condition/damages','type','text','required',false)
    );
    checklist := jsonb_build_array(
      jsonb_build_object('id','arrive','label','Arrive and verify client identity','required',true,'completed',false),
      jsonb_build_object('id','photos-ext','label','Exterior photos','required',true,'completed',false),
      jsonb_build_object('id','photos-int','label','Interior photos','required',false,'completed',false),
      jsonb_build_object('id','odo-before','label','Odometer (before)','required',true,'completed',false),
      jsonb_build_object('id','fuel-before','label','Fuel/charge level (before)','required',true,'completed',false),
      jsonb_build_object('id','handover','label','Handover keys and capture signature/code','required',true,'completed',false)
    );
  elsif mode = 'pickup' then
    target_task_type := 'pickup';
    target_deadline := NEW.end_at;
    task_priority := 'medium';
    task_title := 'Pickup';
    task_description := 'Забрать авто после аренды и зафиксировать состояние';
    lead_hours := public.get_task_lead_hours('tasks.pickupLeadHours', 12);
    geo := jsonb_build_object('pickup', delivery_location, 'dropoff', collect_location);
    metadata_required_inputs := jsonb_build_array(
      jsonb_build_object('key','odo_after','label','Odometer (after)','type','number','required',true),
      jsonb_build_object('key','fuel_after','label','Fuel/charge level (after)','type','select','required',true,'options',jsonb_build_array('Full','3/4','1/2','1/4','Empty')),
      jsonb_build_object('key','photos_return','label','Return photos','type','file','required',true,'multiple',true,'accept','image/*'),
      jsonb_build_object('key','damage_photos','label','Damage photos','type','file','required',false,'multiple',true,'accept','image/*'),
      jsonb_build_object('key','damage_notes','label','Notes on condition/damages','type','text','required',true),
      jsonb_build_object('key','cleaning_needed','label','Cleaning needed?','type','select','required',false,'options',jsonb_build_array('Yes','No'))
    );
    checklist := jsonb_build_array(
      jsonb_build_object('id','arrive','label','Arrive and verify client identity','required',true,'completed',false),
      jsonb_build_object('id','photos-return-ext','label','Exterior photos on return','required',true,'completed',false),
      jsonb_build_object('id','photos-return-int','label','Interior photos on return','required',false,'completed',false),
      jsonb_build_object('id','odo-after','label','Odometer (after)','required',true,'completed',false),
      jsonb_build_object('id','fuel-after','label','Fuel/charge level (after)','required',true,'completed',false),
      jsonb_build_object('id','damage','label','Mark damages/scratches','required',true,'completed',false),
      jsonb_build_object('id','keys','label','Collect keys/equipment','required',true,'completed',false),
      jsonb_build_object('id','route','label','Deliver to service/wash/depot','required',false,'completed',false)
    );
  else
    return null;
  end if;

  -- Skip if no deadline or outside lead window
  if target_deadline is null then
    return null;
  end if;

  if not (target_deadline between utc_now and utc_now + make_interval(hours => lead_hours)) then
    return null;
  end if;

  -- Avoid duplicates per booking + task type
  select exists(
    select 1
    from public.tasks t
    where t.booking_id = NEW.booking_id
      and t.task_type = target_task_type
      and t.status in ('todo','inprogress')
  ) into has_active;

  if has_active then
    return null;
  end if;

  insert into public.tasks (
    booking_id,
    vehicle_id,
    client_id,
    task_type,
    status,
    title,
    deadline_at,
    assignee_driver_id,
    sla_minutes,
    metadata
  )
  values (
    NEW.booking_id,
    NEW.vehicle_id,
    booking_client_id,
    target_task_type,
    'todo',
    task_title,
    target_deadline,
    booking_driver_id,
    0,
    jsonb_build_object(
      'scope','driver',
      'priority', task_priority,
      'description', task_description,
      'category','logistics',
      'channel','Auto',
      'geo', geo,
      'checklist', checklist,
      'requiredInputs', metadata_required_inputs
    )
  );

  return null;
end;
$$;

-- Triggers: delivery and pickup windows
drop trigger if exists trg_calendar_event_delivery_task on public.calendar_events;
create trigger trg_calendar_event_delivery_task
  after insert or update on public.calendar_events
  for each row
  when (NEW.event_type = 'booking')
  execute function public.create_task_from_calendar_event('delivery');

drop trigger if exists trg_calendar_event_pickup_task on public.calendar_events;
create trigger trg_calendar_event_pickup_task
  after insert or update on public.calendar_events
  for each row
  when (NEW.event_type = 'booking')
  execute function public.create_task_from_calendar_event('pickup');
