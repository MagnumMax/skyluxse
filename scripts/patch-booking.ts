
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const BOOKING_ID = "a96ec745-d4c5-4ffa-bda4-ca85b7321386"

async function main() {
    const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Get a vehicle with zoho_item_id
    const { data: vehicle } = await serviceClient
        .from("vehicles")
        .select("id, name, zoho_item_id")
        .not("zoho_item_id", "is", null)
        .limit(1)
        .single()

    if (!vehicle) {
        console.error("No valid vehicle found!")
        return
    }
    console.log(`Using Vehicle: ${vehicle.name} (Zoho Item: ${vehicle.zoho_item_id})`)

    // 2. Update Booking
    const { error } = await serviceClient
        .from("bookings")
        .update({ vehicle_id: vehicle.id }) // removing car_name update as it might not exist or be denormalized
        .eq("id", BOOKING_ID)

    if (error) console.error("Update failed", error)
    else console.log("Booking updated with valid vehicle_id.")
}

main()
