
import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function inspectBooking() {
    const id = "520ec2b5-f11d-4bc6-a32c-cb0226d8ae17";
    const { data, error } = await supabase
        .from('bookings')
        .select('id, sales_order_url, zoho_sales_order_id, external_code')
        .eq('id', id)
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Booking Data:", data);
    }
}

inspectBooking();
