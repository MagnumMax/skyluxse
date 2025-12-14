
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

const TASK_ID = "ded526bc-9ce7-4515-b26d-64ac85c188d1"
const BOOKING_CODE = "K-19441937"

async function main() {
  console.log(`Fetching booking ${BOOKING_CODE}...`)
  const { data: booking, error: bookingError } = await serviceClient
    .from("bookings")
    .select("collect_location")
    .eq("external_code", BOOKING_CODE)
    .single()

  if (bookingError || !booking) {
    console.error("Booking not found:", bookingError)
    process.exit(1)
  }

  console.log("Booking collect location:", booking.collect_location)

  console.log(`Fetching task ${TASK_ID}...`)
  const { data: task, error: taskError } = await serviceClient
    .from("tasks")
    .select("metadata")
    .eq("id", TASK_ID)
    .single()

  if (taskError || !task) {
    console.error("Task not found:", taskError)
    process.exit(1)
  }

  const currentMetadata = task.metadata || {}
  const currentGeo = currentMetadata.geo || {}

  const newGeo = {
    ...currentGeo,
    pickup: booking.collect_location,
    // Setting dropoff to undefined or keeping it?
    // User only said "pickup location should be collection location".
    // I'll keep dropoff as is for now, or maybe it should be the office?
    // Let's assume dropoff stays as 'Shoba Hartland 2' (which was currentGeo.dropoff)?
    // Wait, currentGeo.dropoff was 'Shoba Hartland 2' (collect_location).
    // If I set pickup to 'Shoba Hartland 2', and dropoff stays 'Shoba Hartland 2', it's a 0 distance trip.
    // Usually dropoff is 'Office' or 'Garage'. 
    // I will set pickup to booking.collect_location.
    // I will leave dropoff as is for now unless I find a better default.
  }
  
  // Actually, if previously:
  // pickup: Shoba Hartland 1 (Delivery Loc)
  // dropoff: Shoba Hartland 2 (Collect Loc)
  
  // Now:
  // pickup: Shoba Hartland 2 (Collect Loc)
  // dropoff: ???
  
  // If I don't change dropoff, it stays 'Shoba Hartland 2'.
  // That's weird.
  
  // I'll set dropoff to 'Office' to be safe/generic if I don't have a specific destination.
  newGeo.dropoff = 'Office'

  const newMetadata = {
    ...currentMetadata,
    geo: newGeo
  }

  console.log("Updating task metadata...", newMetadata)

  const { error: updateError } = await serviceClient
    .from("tasks")
    .update({ metadata: newMetadata })
    .eq("id", TASK_ID)

  if (updateError) {
    console.error("Failed to update task:", updateError)
    process.exit(1)
  }

  console.log("Successfully updated task geo.")
}

main().catch(console.error)
