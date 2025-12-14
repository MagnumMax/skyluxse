-- Backfill metadata for existing active Pickup tasks to include new file inputs
UPDATE tasks
SET metadata = jsonb_set(
    metadata,
    '{requiredInputs}',
    '[
      {"key":"odo_after","label":"Odometer (after)","type":"number","required":true},
      {"key":"fuel_after","label":"Fuel/charge level (after)","type":"select","required":true,"options":["Full","3/4","1/2","1/4","Empty"]},
      {"key":"photos_return","label":"Return photos","type":"file","required":true,"multiple":true,"accept":"image/*"},
      {"key":"damage_photos","label":"Damage photos","type":"file","required":false,"multiple":true,"accept":"image/*"},
      {"key":"dashboard_photo","label":"Dashboard photo","type":"file","required":true,"multiple":false,"accept":"image/*"},
      {"key":"return_form","label":"Return form","type":"file","required":true,"multiple":false,"accept":"image/*"},
      {"key":"payment_receipt","label":"Payment receipt","type":"file","required":false,"multiple":false,"accept":"image/*"},
      {"key":"damage_notes","label":"Notes on condition/damages","type":"text","required":true},
      {"key":"cleaning_needed","label":"Cleaning needed?","type":"select","required":false,"options":["Yes","No"]}
    ]'::jsonb
)
WHERE task_type = 'pickup'
  AND status IN ('todo', 'inprogress');

-- Backfill metadata for existing active Delivery tasks to ensure they have all fields (including Agreement Number trigger field damage_notes)
UPDATE tasks
SET metadata = jsonb_set(
    metadata,
    '{requiredInputs}',
    '[
      {"key":"odo_before","label":"Odometer (before)","type":"number","required":true},
      {"key":"fuel_before","label":"Fuel/charge level (before)","type":"select","required":true,"options":["Full","3/4","1/2","1/4","Empty"]},
      {"key":"handover_photos","label":"Handover photos","type":"file","required":true,"multiple":true,"accept":"image/*"},
      {"key":"dashboard_photo","label":"Dashboard photo","type":"file","required":true,"multiple":false,"accept":"image/*"},
      {"key":"agreement","label":"Agreement","type":"file","required":true,"multiple":false,"accept":"image/*"},
      {"key":"payment_receipt","label":"Payment receipt","type":"file","required":false,"multiple":false,"accept":"image/*"},
      {"key":"signature","label":"Signature / code","type":"file","required":true,"multiple":false,"accept":"image/*"},
      {"key":"damage_notes","label":"Notes on condition/damages","type":"text","required":false}
    ]'::jsonb
)
WHERE task_type = 'delivery'
  AND status IN ('todo', 'inprogress');
