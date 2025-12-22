import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing Supabase env: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
}
const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

type BookingRow = {
  id: string
  vehicle_id: string | null
  client_id: string | null
  driver_id: string | null
  start_at: string | null
  end_at: string | null
  delivery_location: string | null
  collect_location: string | null
}

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    throw new Error("Provide bookingId or external code (e.g., K-12345678) as first argument")
  }

  const isExternalCode = /^K-\d+$/.test(arg)
  const query = client
    .from("bookings")
    .select("id, vehicle_id, client_id, driver_id, start_at, end_at, delivery_location, collect_location")
    .limit(1)
    .maybeSingle()
    .then((res) => res)
  const { data: booking, error: bookingError } = isExternalCode
    ? await client
        .from("bookings")
        .select("id, vehicle_id, client_id, driver_id, start_at, end_at, delivery_location, collect_location")
        .eq("external_code", arg)
        .limit(1)
        .single()
    : await client
        .from("bookings")
        .select("id, vehicle_id, client_id, driver_id, start_at, end_at, delivery_location, collect_location")
        .eq("id", arg)
        .limit(1)
        .single()

  if (bookingError) {
    throw new Error(`Failed to load booking ${arg}: ${bookingError.message}`)
  }

  const deliveryTask = buildTaskInsert(booking, "delivery")
  const pickupTask = buildTaskInsert(booking, "pickup")

  await upsertTask(deliveryTask)
  await upsertTask(pickupTask)
}

function buildTaskInsert(row: BookingRow, mode: "delivery" | "pickup") {
  const deadline = mode === "delivery" ? row.start_at : row.end_at
  const geo =
    mode === "delivery"
      ? { pickup: row.collect_location ?? undefined, dropoff: row.delivery_location ?? undefined }
      : { pickup: row.delivery_location ?? undefined, dropoff: row.collect_location ?? undefined }
  const requiredInputs =
    mode === "delivery"
      ? [
          { key: "odo_before", label: "Odometer (before)", type: "number", required: true },
          { key: "fuel_before", label: "Fuel/charge level (before)", type: "select", required: true, options: ["Full", "3/4", "1/2", "1/4", "Empty"] },
          { key: "handover_photos", label: "Handover photos", type: "file", required: true, multiple: true, accept: "image/*" },
          { key: "dashboard_photo", label: "Dashboard photo", type: "file", required: true, multiple: false, accept: "image/*" },
          { key: "agreement", label: "Agreement", type: "file", required: true, multiple: false, accept: "image/*" },
          { key: "payment_receipt", label: "Payment receipt", type: "file", required: false, multiple: false, accept: "image/*" },
          { key: "signature", label: "Signature / code", type: "file", required: true, multiple: false, accept: "image/*" },
          { key: "damage_notes", label: "Notes on condition/damages", type: "text", required: false },
        ]
      : [
          { key: "odo_after", label: "Odometer (after)", type: "number", required: true },
          { key: "fuel_after", label: "Fuel/charge level (after)", type: "select", required: true, options: ["Full", "3/4", "1/2", "1/4", "Empty"] },
          { key: "photos_return", label: "Return photos", type: "file", required: true, multiple: true, accept: "image/*" },
          { key: "damage_photos", label: "Damage photos", type: "file", required: false, multiple: true, accept: "image/*" },
          { key: "dashboard_photo", label: "Dashboard photo", type: "file", required: true, multiple: false, accept: "image/*" },
          { key: "return_form", label: "Return form", type: "file", required: true, multiple: false, accept: "image/*" },
          { key: "payment_receipt", label: "Payment receipt", type: "file", required: false, multiple: false, accept: "image/*" },
          { key: "damage_notes", label: "Notes on condition/damages", type: "text", required: true },
          { key: "cleaning_needed", label: "Cleaning needed?", type: "select", required: false, options: ["Yes", "No"] },
        ]

  const checklist =
    mode === "delivery"
      ? [
          { id: "arrive", label: "Arrive and verify client identity", required: true, completed: false },
          { id: "photos-ext", label: "Exterior photos", required: true, completed: false },
          { id: "photos-int", label: "Interior photos", required: false, completed: false },
          { id: "odo-before", label: "Odometer (before)", required: true, completed: false },
          { id: "fuel-before", label: "Fuel/charge level (before)", required: true, completed: false },
          { id: "handover", label: "Handover keys and capture signature/code", required: true, completed: false },
        ]
      : [
          { id: "arrive", label: "Arrive and verify client identity", required: true, completed: false },
          { id: "photos-return-ext", label: "Exterior photos on return", required: true, completed: false },
          { id: "photos-return-int", label: "Interior photos on return", required: false, completed: false },
          { id: "odo-after", label: "Odometer (after)", required: true, completed: false },
          { id: "fuel-after", label: "Fuel/charge level (after)", required: true, completed: false },
          { id: "damage", label: "Mark damages/scratches", required: true, completed: false },
          { id: "keys", label: "Collect keys/equipment", required: true, completed: false },
        ]

  return {
    booking_id: row.id,
    vehicle_id: row.vehicle_id,
    client_id: row.client_id,
    task_type: mode,
    status: "todo",
    title: mode === "delivery" ? "Delivery" : "Pickup",
    deadline_at: deadline,
    assignee_driver_id: row.driver_id,
    sla_minutes: 0,
    metadata: {
      scope: "driver",
      priority: mode === "delivery" ? "high" : "medium",
      description: mode === "delivery" ? "Доставка авто клиенту" : "Забрать авто после аренды и зафиксировать состояние",
      category: "logistics",
      channel: "Auto",
      geo,
      checklist,
      requiredInputs,
    },
  }
}

async function upsertTask(payload: any) {
  const exists = await client
    .from("tasks")
    .select("id")
    .eq("booking_id", payload.booking_id)
    .eq("task_type", payload.task_type)
    .in("status", ["todo", "inprogress"]) 
    .limit(1)
    .maybeSingle()

  if (exists.error && exists.error.code !== "PGRST116") {
    throw new Error(`Failed to check existing tasks: ${exists.error.message}`)
  }

  if (exists.data?.id) {
    return null
  }

  const { data, error } = await client.from("tasks").insert(payload).select("id").single()
  if (error) {
    throw new Error(`Failed to insert task: ${error.message}`)
  }
  return data.id
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
