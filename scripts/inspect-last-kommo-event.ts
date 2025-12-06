
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log("Fetching latest Kommo webhook event...")

    const { data, error } = await serviceClient
        .from("kommo_webhook_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

    if (error) {
        console.error("Error fetching event:", error)
        return
    }

    if (!data) {
        console.log("No events found.")
        return
    }

    console.log("Latest Event ID:", data.id)
    console.log("Created At:", data.created_at)

    const leads = data.payload?.leads?.status || []
    if (leads.length === 0) {
        console.log("No leads in status array. Payload keys:", Object.keys(data.payload || {}))
        return
    }

    const leadId = leads[0].id
    console.log(`Inspecting Lead ID: ${leadId}`)

    // In the real webhook, we fetch the lead details with custom_fields. 
    // But the webhook payload itself might be minimal (just status change).
    // The 'kommo_webhook_events' table stores the *webhook payload*.
    // If the webhook payload doesn't contain custom_fields (which is typical for status hooks),
    // we might need to fetch the lead actual data from Kommo if we had access, but we don't have easy API access here without setup.
    // HOWEVER, route.ts *fetches* the lead details: `const lead = await kommoGet(...)`.
    // Wait, `kommo_webhook_events` stores the *incoming* payload, not the fetched lead data?
    // Let's check route.ts.
    // Line 1124: `await serviceClient.from("kommo_webhook_events").insert({ ..., payload, ... })`
    // Yes, it stores the incoming payload.

    // BUT the user said "check on any booking". 
    // If the webhook payload is just `{ leads: { status: [...] } }`, it won't have the custom fields.
    // The User might imply that they sent a full lead or I should look at `sales_leads` or `bookings`?
    // No, `bookings` connects to `kommo` via `source_payload_id`.

    // Is there a table that stores the *processed* lead JSON?
    // `sales_leads.ai_summary`? No.
    // Maybe I can fetch the lead using the `kommoGet` logic if I replicate it?
    // `app/api/integrations/kommo/webhook/route.ts` has `kommoGet`.
    // I can try to fetch the lead details for the ID found in the webhook event, if I have the Env vars loaded.

    // Let's try to simulate the `kommoGet` call for the lead ID found in the last event.

    const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL
    const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN

    if (!KOMMO_BASE_URL || !KOMMO_ACCESS_TOKEN) {
        console.error("Missing Kommo Env Vars")
        return
    }

    const url = `${KOMMO_BASE_URL}/api/v4/leads/${leadId}?with=custom_fields`
    console.log("Fetching lead details from:", url)

    const resp = await fetch(url, {
        headers: {
            Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}`
        }
    })

    if (!resp.ok) {
        console.error("Failed to fetch lead from Kommo:", resp.status, await resp.text())
        return
    }

    const leadData = await resp.json()
    const fields = leadData.custom_fields_values || []

    console.log("\n--- Custom Fields ---")
    fields.forEach((f: any) => {
        console.log(`ID: ${f.field_id}, Name: "${f.field_name}", Code: "${f.field_code}", Values: ${JSON.stringify(f.values)}`)
        if (f.field_name.toLowerCase().includes("limit") || f.field_name.toLowerCase().includes("km")) {
            console.log(">>> POTENTIAL MATCH <<<")
        }
    })
}

main()
