
import { recognizeLatestClientDocument } from "../lib/ai/document-recognition"
import { serviceClient } from "../lib/supabase/service-client"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

async function main() {
    // 1. Get a client ID that has a document link
    const { data: links, error } = await serviceClient
        .from("document_links")
        .select("entity_id")
        .eq("scope", "client")
        .limit(1)

    if (error) {
        console.error("Error finding client with docs:", error)
        return
    }

    if (!links || links.length === 0) {
        console.log("No clients with document links found.")
        return
    }

    const clientId = links[0].entity_id
    console.log(`Testing recognition for client: ${clientId}`)

    try {
        const result = await recognizeLatestClientDocument(clientId, { force: true, allowProFallback: false })
        console.log("Success:", result)
    } catch (err) {
        console.error("CAUGHT ERROR:", err)
        if (typeof err === 'object' && err !== null) {
            console.error("Error keys:", Object.keys(err))
            console.error("Error full JSON:", JSON.stringify(err, null, 2))
        }
    }
}

main()
