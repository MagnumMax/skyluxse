import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

const BOOKING_ID = "597519fa-dcaa-4010-a4df-7d0b84f06ab3";

async function main() {
    console.log(`Clearing Zoho fields for booking: ${BOOKING_ID}`);

    const { error } = await serviceClient
        .from("bookings")
        .update({
            zoho_sales_order_id: null,
            sales_order_url: null
        })
        .eq("id", BOOKING_ID);

    if (error) {
        console.error("Failed to clear booking:", error);
    } else {
        console.log("Successfully cleared zoho_sales_order_id and sales_order_url.");
    }
}

main();
