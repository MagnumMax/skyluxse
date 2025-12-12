
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    const code = "K-19441937"
    console.log(`Clearing Zoho fields for booking: ${code}`)

    const { data: booking } = await serviceClient
        .from("bookings")
        .select("id")
        .eq("external_code", code)
        .single()

    if (!booking) {
        console.error("Booking not found")
        return
    }

    const { error } = await serviceClient
        .from("bookings")
        .update({
            zoho_sales_order_id: null,
            sales_order_url: null
        })
        .eq("id", booking.id)

    if (error) {
        console.error("Failed to clear booking:", error)
    } else {
        console.log("Successfully cleared zoho_sales_order_id and sales_order_url.")
    }
}

main()
