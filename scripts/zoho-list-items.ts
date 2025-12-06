
import dotenv from "dotenv"
import { getBooksClient, getOrganizationId } from "../lib/zoho/books"

dotenv.config({ path: ".env.local" })

async function main() {
    try {
        const orgId = await getOrganizationId()
        const client = await getBooksClient()

        console.log("Fetching Zoho Items...")
        // Filter by Active status to match user's screenshot filter
        const res = await client.get("/items?status=active", orgId)

        if (res.code === 0) {
            console.log(`Found ${res.items.length} items.`)
            res.items.forEach((item: any) => {
                console.log(`Name: "${item.name}", SKU: "${item.sku}", ID: ${item.item_id}, Rate: ${item.rate}`)
            })
            if (res.items.length > 0) {
                console.log("\nSample full item:", JSON.stringify(res.items[0], null, 2))
            }
        } else {
            console.error("Failed to fetch items:", res.message)
        }
    } catch (e) {
        console.error(e)
    }
}

main()
