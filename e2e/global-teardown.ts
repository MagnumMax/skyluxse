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
  throw new Error("Missing Supabase environment variables for global teardown")
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

async function globalTeardown() {
  console.log("Starting global teardown of test data...")

  // 1. Find test bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id")
    .like("external_code", "BK-TEST-%")

  if (bookingsError) {
    console.error("Error finding test bookings:", bookingsError)
  } else if (bookings && bookings.length > 0) {
    const bookingIds = bookings.map((b) => b.id)
    
    // Delete tasks for these bookings
    const { error: tasksError } = await supabase.from("tasks").delete().in("booking_id", bookingIds)
    if (tasksError) console.error("Error deleting tasks:", tasksError)

    // Delete bookings
    const { error: deleteBookingsError } = await supabase.from("bookings").delete().in("id", bookingIds)
    if (deleteBookingsError) console.error("Error deleting bookings:", deleteBookingsError)
  }

  // 2. Delete test vehicles
  const { error: vehiclesError } = await supabase
    .from("vehicles")
    .delete()
    .eq("name", "Test Vehicle Playwright")
  
  if (vehiclesError) console.error("Error deleting vehicles:", vehiclesError)

  // 3. Delete test clients
  const { error: clientsError } = await supabase
    .from("clients")
    .delete()
    .eq("name", "Test Client Playwright")

  if (clientsError) console.error("Error deleting clients:", clientsError)

  // 4. Delete test users (staff and auth)
  const { data: users, error: usersError } = await supabase
    .from("staff_accounts")
    .select("id")
    .like("email", "test-user-%")

  if (usersError) {
    console.error("Error finding test users:", usersError)
  } else if (users && users.length > 0) {
    const userIds = users.map(u => u.id)
    
    // Delete staff accounts
    const { error: staffError } = await supabase.from("staff_accounts").delete().in("id", userIds)
    if (staffError) console.error("Error deleting staff accounts:", staffError)

    // Delete auth users
    for (const userId of userIds) {
        const { error: authError } = await supabase.auth.admin.deleteUser(userId)
        if (authError) console.error(`Error deleting auth user ${userId}:`, authError)
    }
  }
  
  console.log("Global teardown complete.")
}

export default globalTeardown;
