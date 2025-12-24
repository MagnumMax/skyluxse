
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
    console.error("Missing env vars. Ensure .env.local exists and has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
}

const serviceClient = createClient(supabaseUrl, serviceKey)

async function main() {
    console.log("Verifying DB schema...")
    
    // Check if we can select rental_prices
    const { data, error } = await serviceClient
        .from('vehicles')
        .select('id, name, rental_prices')
        .limit(1)
    
    if (error) {
        console.error("Verification failed:", error)
        process.exit(1)
    }

    console.log("Success! Fetched vehicle data:", data)
    
    if (data && data.length > 0) {
        console.log("Rental prices column exists and is accessible.")
    } else {
        console.log("No vehicles found, but query succeeded.")
    }
}

main()
