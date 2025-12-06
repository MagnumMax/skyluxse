
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

async function main() {
    const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL
    const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN

    if (!KOMMO_BASE_URL || !KOMMO_ACCESS_TOKEN) {
        console.error("Missing Kommo Env Vars")
        return
    }

    const url = `${KOMMO_BASE_URL}/api/v4/leads/custom_fields`
    console.log("Fetching custom fields definitions from:", url)

    const resp = await fetch(url, {
        headers: {
            Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}`
        }
    })

    if (!resp.ok) {
        console.error("Failed to fetch fields:", resp.status, await resp.text())
        return
    }

    const data = await resp.json()
    const fields = data._embedded?.custom_fields || []

    console.log(`Found ${fields.length} custom fields. Searching for 'KM' or 'Limit'...`)

    fields.forEach((f: any) => {
        const name = f.name.toLowerCase()
        const match = name.includes("limit") || name.includes("km") || name.includes("mileage")

        // Log all matches, or all fields if few
        if (match) {
            console.log(`MATCH: ID=${f.id}, Name="${f.name}", Code="${f.code}", Type="${f.type}"`)
        }
    })

    // Also dump all names for sanity check if no match found
    // console.log("All field names:", fields.map(f => f.name).join(", "))
}

main()
