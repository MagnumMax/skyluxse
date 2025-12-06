
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import { getBooksClient, getOrganizationId } from "../lib/zoho/books"

dotenv.config({ path: ".env.local" })

async function main() {
    const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log("Fetching Vehicles from DB...")
    const { data: vehicles } = await serviceClient.from("vehicles").select("id, name, plate_number, zoho_item_id")
    if (!vehicles) return
    console.log(`Found ${vehicles.length} vehicles.`)

    console.log("Fetching Zoho Items...")
    const orgId = await getOrganizationId()
    const client = await getBooksClient()
    const res = await client.get("/items?status=active", orgId)

    if (res.code !== 0) {
        console.error("Failed to fetch matches", res.message)
        return
    }

    const items = res.items
    console.log(`Found ${items.length} active items in Zoho.`)

    // Create Map for quick lookup
    // 1. Map by SKU (Plate)
    // 2. Map by Name (Exact or Fuzzy?)
    const itemBySku = new Map<string, any>()
    const itemByName = new Map<string, any>()

    items.forEach((item: any) => {
        if (item.sku) itemBySku.set(item.sku.trim(), item)
        if (item.name) itemByName.set(item.name.trim().toLowerCase(), item)
    })

    let updatedCount = 0

    for (const v of vehicles) {
        let match = null

        // 1. Try Plate Match (SKU)
        if (v.plate_number && itemBySku.has(v.plate_number.trim())) {
            match = itemBySku.get(v.plate_number.trim())
            console.log(`[MATCH SKU] ${v.name} (${v.plate_number}) -> ${match.name} (${match.item_id})`)
        }
        // 2. Try Name Match (fallback)
        else if (v.name && itemByName.has(v.name.trim().toLowerCase())) {
            match = itemByName.get(v.name.trim().toLowerCase())
            console.log(`[MATCH NAME] ${v.name} -> ${match.name} (${match.item_id})`)
        }

        if (match) {
            if (v.zoho_item_id !== match.item_id) {
                const { error } = await serviceClient
                    .from("vehicles")
                    .update({ zoho_item_id: match.item_id })
                    .eq("id", v.id)

                if (error) console.error(`Failed to update ${v.name}:`, error.message)
                else updatedCount++
            }
        } else {
            console.log(`[NO MATCH] ${v.name} (${v.plate_number})`)
        }
    }

    console.log(`\nSync complete. Updated ${updatedCount} vehicles.`)
}

main()
