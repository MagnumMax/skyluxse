
import { createClient } from "@supabase/supabase-js"
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
    console.log("--- REAL DATABASE DATA ---")
    
    // Create client directly to avoid server-only import in script context
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await serviceClient
        .from('vehicles')
        .select('id, make, model, rental_prices')
        .limit(5)

    if (error) {
        console.error("Error:", error)
    } else {
        console.log("Found vehicles:", data?.length)
        if (data && data.length > 0) {
            console.log(JSON.stringify(data, null, 2))
        } else {
            console.log("No vehicles found in DB (or RLS blocked access if not using service role).")
        }
    }
}

main()
