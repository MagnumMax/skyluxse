
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    const code = process.argv[2]
    if (!code) {
        console.error("Please provide booking code (e.g. K-12345)")
        return
    }

    console.log(`Inspecting timeline for ${code}...`)

    const { data: booking, error: bookingError } = await serviceClient
        .from("bookings")
        .select("id, status, kommo_status_id, zoho_sales_order_id")
        .eq("external_code", code)
        .single()

    if (bookingError || !booking) {
        console.error("Booking not found", bookingError)
        return
    }

    console.log("Booking found:", booking)

    const { data: events, error: eventsError } = await serviceClient
        .from("booking_timeline_events")
        .select("*")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: false })

    if (eventsError) {
        console.error("Failed to fetch events", eventsError)
        return
    }

    console.log("\nTimeline Events:")
    events.forEach(e => {
        console.log(`[${e.created_at}] ${e.event_type}: ${e.message}`)
    })
}

main()
