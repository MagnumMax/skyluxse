import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env vars")
  process.exit(1)
}

const serviceClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

const BOOKING_CODE = "K-19441937"

async function main() {
  console.log(`Searching for booking ${BOOKING_CODE}...`)

  const { data: booking, error: bookingError } = await serviceClient
    .from("bookings")
    .select("id, client_id, driver_id, vehicle_id, start_at, end_at, delivery_location, collect_location")
    .eq("external_code", BOOKING_CODE)
    .single()

  if (bookingError || !booking) {
    console.error("Booking not found or error:", bookingError)
    process.exit(1)
  }

  console.log("Found booking:", booking)

  // Check for existing pickup task
  const { data: existingTasks } = await serviceClient
    .from("tasks")
    .select("id, status")
    .eq("booking_id", booking.id)
    .eq("task_type", "pickup")

  if (existingTasks && existingTasks.length > 0) {
    console.log("Pickup task already exists:", existingTasks)
    // Optional: process.exit(0) if we don't want to create duplicate
    // But user asked to add, maybe they know it's missing or deleted.
    // Let's ask or just warn. I'll proceed but log it.
    console.log("Creating another one as requested...")
  }

  const deliveryLocation = booking.delivery_location
  const collectLocation = booking.collect_location
  
  // Logic from migration 0047
  const geo = {
    pickup: deliveryLocation,
    dropoff: collectLocation
  }

  const metadataRequiredInputs = [
    { key: 'odo_after', label: 'Odometer (after)', type: 'number', required: true },
    { key: 'fuel_after', label: 'Fuel/charge level (after)', type: 'select', required: true, options: ['Full','3/4','1/2','1/4','Empty'] },
    { key: 'photos_return', label: 'Return photos', type: 'file', required: true, multiple: true, accept: 'image/*' },
    { key: 'damage_photos', label: 'Damage photos', type: 'file', required: false, multiple: true, accept: 'image/*' },
    { key: 'damage_notes', label: 'Notes on condition/damages', type: 'text', required: true },
    { key: 'cleaning_needed', label: 'Cleaning needed?', type: 'select', required: false, options: ['Yes','No'] }
  ]

  const checklist = [
    { id: 'arrive', label: 'Arrive and verify client identity', required: true, completed: false },
    { id: 'photos-return-ext', label: 'Exterior photos on return', required: true, completed: false },
    { id: 'photos-return-int', label: 'Interior photos on return', required: false, completed: false },
    { id: 'odo-after', label: 'Odometer (after)', required: true, completed: false },
    { id: 'fuel-after', label: 'Fuel/charge level (after)', required: true, completed: false },
    { id: 'damage', label: 'Mark damages/scratches', required: true, completed: false },
    { id: 'keys', label: 'Collect keys/equipment', required: true, completed: false },
    { id: 'route', label: 'Deliver to service/wash/depot', required: false, completed: false }
  ]

  const taskData = {
    booking_id: booking.id,
    vehicle_id: booking.vehicle_id,
    client_id: booking.client_id,
    task_type: 'pickup',
    status: 'todo',
    title: 'Pickup',
    deadline_at: booking.end_at,
    assignee_driver_id: booking.driver_id, // Assign to booking driver
    sla_minutes: 0,
    metadata: {
      scope: 'driver',
      priority: 'medium',
      description: 'Забрать авто после аренды и зафиксировать состояние',
      category: 'logistics',
      channel: 'Manual',
      geo: geo,
      checklist: checklist,
      requiredInputs: metadataRequiredInputs
    }
  }

  console.log("Creating task with data:", JSON.stringify(taskData, null, 2))

  const { data: newTask, error: createError } = await serviceClient
    .from("tasks")
    .insert(taskData)
    .select()
    .single()

  if (createError) {
    console.error("Failed to create task:", createError)
    process.exit(1)
  }

  console.log("Successfully created Pickup task:", newTask.id)
}

main().catch(console.error)
