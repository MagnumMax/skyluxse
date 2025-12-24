
CREATE OR REPLACE FUNCTION public.create_task_from_calendar_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  target_task_type text;
  booking_record record;
  booking_driver_id uuid;
  booking_client_id uuid;
  task_title text;
  task_description text;
  task_priority text;
  geo jsonb;
  checklist jsonb;
  target_deadline timestamptz;
  has_active boolean;
  metadata_required_inputs jsonb;
  -- Default driver ID for SkyLuxse (Driver Account)
  default_driver_id uuid := '07c91c85-62c8-44dd-8351-ef78826e633f'; 
begin
  -- Get argument from trigger definition
  if TG_NARGS > 0 then
    target_task_type := TG_ARGV[0];
  else
    return null; -- Should not happen if trigger is defined correctly
  end if;

  -- Fetch booking details
  select * into booking_record from public.bookings where id = NEW.booking_id;
  
  if not found then
    return null;
  end if;

  booking_client_id := booking_record.client_id;
  
  -- Use booking driver OR fallback to default driver
  booking_driver_id := coalesce(booking_record.driver_id, default_driver_id);

  -- Determine task properties based on type
  if target_task_type = 'delivery' then
    target_deadline := NEW.start_at;
    task_title := 'Доставка';
    task_description := 'Доставка авто клиенту';
    task_priority := 'high';
    geo := jsonb_build_object(
       'pickup', booking_record.collect_location,
       'dropoff', booking_record.delivery_location
    );
    -- Standard checklist for delivery
    checklist := '[
      {"id": "arrive", "label": "Arrive and verify client identity", "required": true, "completed": false},
      {"id": "photos-delivery-ext", "label": "Exterior photos on delivery", "required": true, "completed": false},
      {"id": "photos-delivery-int", "label": "Interior photos on delivery", "required": false, "completed": false},
      {"id": "odo-before", "label": "Odometer (before)", "required": true, "completed": false},
      {"id": "fuel-before", "label": "Fuel/charge level (before)", "required": true, "completed": false},
      {"id": "damage", "label": "Mark damages/scratches", "required": true, "completed": false},
      {"id": "contract", "label": "Sign rental agreement", "required": true, "completed": false},
      {"id": "payment", "label": "Collect payment/deposit", "required": true, "completed": false},
      {"id": "keys", "label": "Handover keys", "required": true, "completed": false}
    ]'::jsonb;
    metadata_required_inputs := '[
      {"key": "odo_out", "label": "Odometer Out (km)", "type": "number", "required": true},
      {"key": "fuel_out", "label": "Fuel Out (%)", "type": "number", "required": true}
    ]'::jsonb;

  elsif target_task_type = 'pickup' then
    target_deadline := NEW.end_at;
    task_title := 'Забор';
    task_description := 'Забрать авто после аренды и зафиксировать состояние';
    task_priority := 'medium';
    geo := jsonb_build_object(
       'pickup', booking_record.delivery_location, 
       'dropoff', booking_record.collect_location 
    );
    -- Standard checklist for pickup
    checklist := '[
      {"id": "arrive", "label": "Arrive and verify client identity", "required": true, "completed": false},
      {"id": "photos-return-ext", "label": "Exterior photos on return", "required": true, "completed": false},
      {"id": "photos-return-int", "label": "Interior photos on return", "required": false, "completed": false},
      {"id": "odo-after", "label": "Odometer (after)", "required": true, "completed": false},
      {"id": "fuel-after", "label": "Fuel/charge level (after)", "required": true, "completed": false},
      {"id": "damage", "label": "Mark damages/scratches", "required": true, "completed": false},
      {"id": "keys", "label": "Collect keys/equipment", "required": true, "completed": false},
      {"id": "route", "label": "Deliver to service/wash/depot", "required": false, "completed": false}
    ]'::jsonb;
    metadata_required_inputs := '[
      {"key": "odo_in", "label": "Odometer In (km)", "type": "number", "required": true},
      {"key": "fuel_in", "label": "Fuel In (%)", "type": "number", "required": true}
    ]'::jsonb;

  else
    return null; -- Unknown task type
  end if;

  -- Idempotency check: don't create if open task exists for this booking & type
  select exists(
    select 1 from public.tasks t
    where t.booking_id = NEW.booking_id
      and t.task_type = target_task_type::task_type
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
    target_task_type::task_type,
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
$function$;
