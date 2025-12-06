
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
    const { count } = await serviceClient.from("bookings").select("*", { count: "exact", head: true })
    console.log(`Bookings Count: ${count}`)

    const { data: vehicles, error } = await serviceClient.from("vehicles").select("id, name, zoho_item_id").limit(1)
    if (error) console.error("Vehicles error:", error)
    else console.log("Vehicle Sample:", vehicles)

    const { count: staffCount } = await serviceClient.from("staff_accounts").select("*", { count: "exact", head: true })
    console.log("Staff Count:", staffCount)

    const { data: firstBooking } = await serviceClient.from("bookings").select("owner_id").not("owner_id", "is", null).limit(1)
    console.log("Sample Booking Owner ID:", firstBooking?.[0]?.owner_id)
}

main()
