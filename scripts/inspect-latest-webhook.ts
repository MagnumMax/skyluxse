
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    const leadId = "19441937"
    console.log(`Inspecting latest webhook event for Lead: ${leadId}`)

    const { data: event, error } = await serviceClient
        .from("kommo_webhook_events")
        .select("*")
        .or(`source_payload_id.eq.${leadId},source_payload_id.eq.kommo:${leadId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

    if (error) {
        console.error("Error fetching event:", error)
        return
    }

    if (!event) {
        console.log("No webhook event found for this lead.")
        return
    }

    console.log("Latest Event ID:", event.id)
    console.log("Created At:", event.created_at)
    console.log("Status:", event.status)
    console.log("Kommo Status ID:", event.kommo_status_id)
    console.log("Kommo Status Label:", event.kommo_status_label)
    console.log("Error Message:", event.error_message)
    
    // Check payload structure
    const payload = event.payload
    if (payload && payload.leads && payload.leads.status) {
        console.log("Payload Status Block:", JSON.stringify(payload.leads.status, null, 2))
    }
}

main()
