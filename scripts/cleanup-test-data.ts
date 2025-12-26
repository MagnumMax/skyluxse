import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

async function cleanup() {
  console.log("Starting cleanup of test data...")

  // 1. Find test bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id")
    .like("external_code", "BK-TEST-%")

  if (bookingsError) {
    console.error("Error finding test bookings:", bookingsError)
  } else if (bookings && bookings.length > 0) {
    const bookingIds = bookings.map((b) => b.id)
    console.log(`Found ${bookingIds.length} test bookings. Deleting related tasks...`)

    // Delete tasks for these bookings
    const { error: tasksError } = await supabase.from("tasks").delete().in("booking_id", bookingIds)
    if (tasksError) console.error("Error deleting tasks:", tasksError)

    console.log("Deleting bookings...")
    const { error: deleteBookingsError } = await supabase.from("bookings").delete().in("id", bookingIds)
    if (deleteBookingsError) console.error("Error deleting bookings:", deleteBookingsError)
  } else {
    console.log("No test bookings found.")
  }

  // 2. Delete test vehicles
  console.log("Deleting test vehicles...")
  const { error: vehiclesError, count: vehicleCount } = await supabase
    .from("vehicles")
    .delete({ count: 'exact' })
    .eq("name", "Test Vehicle Playwright")
  
  if (vehiclesError) console.error("Error deleting vehicles:", vehiclesError)
  else console.log(`Deleted test vehicles.`)

  // 3. Delete test clients
  console.log("Deleting test clients...")
  // We can identify them by email pattern or name, but let's use name as in fixture
  const { error: clientsError, count: clientCount } = await supabase
    .from("clients")
    .delete({ count: 'exact' })
    .eq("name", "Test Client Playwright")

  if (clientsError) console.error("Error deleting clients:", clientsError)
  else console.log(`Deleted test clients.`)

  // 4. Delete test users (staff and auth)
  console.log("Finding test users...")
  const { data: users, error: usersError } = await supabase
    .from("staff_accounts")
    .select("id, email")
    .like("email", "test-user-%")

  if (usersError) {
    console.error("Error finding test users:", usersError)
  } else if (users && users.length > 0) {
    console.log(`Found ${users.length} test users.`)
    const userIds = users.map(u => u.id)
    
    // Delete staff accounts
    const { error: staffError } = await supabase.from("staff_accounts").delete().in("id", userIds)
    if (staffError) console.error("Error deleting staff accounts:", staffError)

    // Delete auth users
    for (const userId of userIds) {
        const { error: authError } = await supabase.auth.admin.deleteUser(userId)
        if (authError) console.error(`Error deleting auth user ${userId}:`, authError)
    }
  } else {
    console.log("No test users found.")
  }

  console.log("Cleanup complete.")
}

cleanup().catch((e) => {
  console.error(e)
  process.exit(1)
})
