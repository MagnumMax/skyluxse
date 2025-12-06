
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

async function main() {
    const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { count } = await serviceClient
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .not("zoho_item_id", "is", null)

    const { count: total } = await serviceClient
        .from("vehicles")
        .select("*", { count: "exact", head: true })

    console.log(`Vehicles with Zoho Item ID: ${count} / ${total}`)
}

main()
