
import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getBooksClient, getOrganizationId } from "../lib/zoho/books";

async function main() {
    console.log("Fetching latest Sales Orders from Zoho...");
    const client = await getBooksClient();
    const orgId = await getOrganizationId();
    
    // Fetch last 5 sales orders
    const response = await client.get("/salesorders?sort_column=date&sort_order=D&per_page=5", orgId);
    
    if (response.code !== 0) {
        console.error("Failed to fetch sales orders:", response.message);
        return;
    }

    const salesOrders = response.salesorders;
    console.log(`Found ${salesOrders.length} orders.`);

    for (const so of salesOrders) {
        console.log(`\n--------------------------------------------------`);
        console.log(`Order: ${so.salesorder_number} (ID: ${so.salesorder_id})`);
        console.log(`Ref: ${so.reference_number}`);
        console.log(`Customer: ${so.customer_name}`);
        
        // Fetch full details for line items
        const detailResp = await client.get(`/salesorders/${so.salesorder_id}`, orgId);
        if (detailResp.code === 0) {
            const details = detailResp.salesorder;
            console.log("Line Items:");
            details.line_items.forEach((item: any) => {
                console.log(` - [${item.item_id}] ${item.name}`);
                console.log(`   Desc: ${item.description}`);
                console.log(`   Rate: ${item.rate}, Qty: ${item.quantity}, Total: ${item.item_total}`);
                if (item.name.includes("Security Deposit")) {
                    console.log("   FULL ITEM:", JSON.stringify(item, null, 2));
                }
            });
        }
    }
}

main();
