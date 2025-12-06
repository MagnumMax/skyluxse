
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

async function main() {
    const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find a booking that has car_id
    const { data: booking } = await serviceClient
        .from("bookings")
        .select("id, external_code, car_id")
        .not("car_id", "is", null)
        .limit(1)
        .single()

    if (booking) {
        console.log("Found Test Booking with Car:")
        console.log(`ID: ${booking.id}`)
        console.log(`Code: ${booking.external_code}`)
        console.log(`Car ID: ${booking.car_id}`)
    } else {
        console.log("No booking with car_id found.")
    }
}

main()
