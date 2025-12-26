
-- 2025-12-26: Auto-create tasks directly from bookings (since calendar_events sync is missing)

CREATE OR REPLACE FUNCTION public.create_task_from_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  target_task_type text;
  task_title text;
  task_description text;
  task_priority text;
  geo jsonb;
  checklist jsonb;
  target_deadline timestamptz;
  has_active boolean;
  metadata_required_inputs jsonb;
  lead_hours int;
  utc_now timestamptz := timezone('utc', now());
  -- Default driver ID for SkyLuxse (Driver Account)
  default_driver_id uuid := '07c91c85-62c8-44dd-8351-ef78826e633f';
  assignee_id uuid;
begin
  -- Get argument from trigger definition
  if TG_NARGS > 0 then
    target_task_type := TG_ARGV[0];
  else
    return null;
  end if;

  -- Determine assignee: booking driver OR fallback to default driver
  assignee_id := coalesce(NEW.driver_id, default_driver_id);

  -- Determine task properties based on type
  if target_task_type = 'delivery' then
    target_deadline := NEW.start_at;
    task_title := 'Доставка';
    task_description := 'Доставка авто клиенту';
    task_priority := 'high';
    lead_hours := public.get_task_lead_hours('tasks.deliveryLeadHours', 12);
    geo := jsonb_build_object(
       'pickup', NEW.collect_location,
       'dropoff', NEW.delivery_location
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
    lead_hours := public.get_task_lead_hours('tasks.pickupLeadHours', 12);
    geo := jsonb_build_object(
       'pickup', NEW.delivery_location, 
       'dropoff', NEW.collect_location 
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

  -- Skip if no deadline
  if target_deadline is null then
    return null;
  end if;

  -- Check lead window: only create if deadline is within [now, now + lead_hours]
  if not (target_deadline between utc_now and utc_now + make_interval(hours => lead_hours)) then
    -- Optional: maybe we want to create them anyway if they don't exist?
    -- The original logic restricted it. Let's keep it to avoid spamming tasks for future bookings.
    return null;
  end if;

  -- Idempotency check: don't create if open task exists for this booking & type
  select exists(
    select 1 from public.tasks t
    where t.booking_id = NEW.id
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
    NEW.id,
    NEW.vehicle_id,
    NEW.client_id,
    target_task_type::task_type,
    'todo',
    task_title,
    target_deadline,
    assignee_id,
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

-- Create triggers on bookings table
DROP TRIGGER IF EXISTS trg_booking_delivery_task ON public.bookings;
CREATE TRIGGER trg_booking_delivery_task
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_task_from_booking('delivery');

DROP TRIGGER IF EXISTS trg_booking_pickup_task ON public.bookings;
CREATE TRIGGER trg_booking_pickup_task
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_task_from_booking('pickup');
