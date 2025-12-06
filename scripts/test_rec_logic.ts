
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing credentials")
    process.exit(1)
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

// --- MOCKED CONSTANTS ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
// ... (rest of logic copied below)

// --- INSERT LOGIC HERE ---
// Copying recognizeLatestClientDocument logic manually to ensure it runs
// Logic adapted from lib/ai/document-recognition.ts

async function recognizeLatestClientDocument(clientId: string, opts: { force?: boolean, allowProFallback?: boolean } = {}) {
    console.log(`Debug: Processing client ${clientId}`)

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set")

    const { data: clientRow, error: clientError } = await serviceClient
        .from("clients")
        .select("doc_status, doc_processed_at, doc_confidence")
        .eq("id", clientId)
        .maybeSingle()

    if (clientError) {
        console.error("Client fetch error:", clientError)
        throw clientError
    }

    console.log("Client Row:", clientRow)

    const { data: docLinks, error: linkError } = await serviceClient
        .from("document_links")
        .select(
            "document_id, doc_type, metadata, created_at, document:documents(id, bucket, storage_path, file_name, mime_type, original_name, metadata, created_at)"
        )
        .eq("entity_id", clientId)
        .eq("scope", "client")
        .order("created_at", { ascending: false })

    if (linkError) {
        console.error("Link fetch error:", linkError)
        throw linkError
    }

    const links = (docLinks ?? []).filter((l: any) => l.document_id && l.document)
    if (!links.length) {
        throw new Error("No documents linked to client")
    }

    console.log(`Found ${links.length} links`)

    // Skipping date check for debug to force run? Use opts.force
    // ...

    // Just try to update with DUMMY data to see if UPDATE fails, 
    // or try to run the full thing?
    // Let's run full thing but mock Gemini if needed? 
    // No, let's assume Gemini works and just try to replicate the DB error.

    // Construct a dummy update to test the COLUMNS
    const update: any = {
        doc_status: "processing", // just testing update
        doc_processed_at: new Date().toISOString(),
        // Standard fields
        first_name: "Test",
        last_name: "Debug",
        name: "Test Debug",
        date_of_birth: "1990-01-01",
        nationality: "TestCountry",
        address: "123 Test St",
        document_number: "DOC123",
        issue_date: "2020-01-01",
        expiry_date: "2030-01-01",
        issuing_country: "US",
        driver_license_class: "B",
        driver_license_restrictions: "None",
        driver_license_endorsements: "None"
    }

    console.log("Attempting UPDATE with:", JSON.stringify(update, null, 2))

    const { error: updateError } = await serviceClient.from("clients").update(update).eq("id", clientId)
    if (updateError) {
        console.error("UPDATE ERROR:", updateError)
        throw updateError
    }

    console.log("Update success!")
    return { status: "done" }
}

async function main() {
    // 1. Find a client
    const { data: links, error } = await serviceClient
        .from("document_links")
        .select("entity_id")
        .eq("scope", "client")
        .limit(1)

    if (!links?.length) {
        console.log("No client found")
        return
    }
    const clientId = links[0].entity_id

    try {
        await recognizeLatestClientDocument(clientId, { force: true })
    } catch (e) {
        console.error("Caught in main:", e)
    }
}

main()
