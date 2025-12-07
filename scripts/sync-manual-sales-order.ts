import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getBooksClient, getOrganizationId } from "../lib/zoho/books";

async function getContactById(contactId: string) {
    const client = await getBooksClient();
    const orgId = await getOrganizationId();
    const response = await client.get(`/contacts/${contactId}`, orgId);
    if (response.code === 0) {
        return response.contact;
    }
    return null;
}

const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ZOHO_SALES_ORDER_ID = "6183693000004109109";

async function syncManualSalesOrder() {
    console.log(`\n🔍 Syncing Manual Sales Order: ${ZOHO_SALES_ORDER_ID}\n`);

    try {
        // 1. Get Sales Order from Zoho
        console.log("📥 Fetching Sales Order from Zoho...");
        const client = await getBooksClient();
        const orgId = await getOrganizationId();
        const soResponse = await client.get(`/salesorders/${ZOHO_SALES_ORDER_ID}`, orgId);

        if (soResponse.code !== 0) {
            console.error("❌ Failed to fetch Sales Order from Zoho:", soResponse.message);
            return;
        }

        const salesOrder = soResponse.salesorder;
        console.log("✅ Sales Order found in Zoho:");
        console.log({
            salesorder_id: salesOrder.salesorder_id,
            salesorder_number: salesOrder.salesorder_number,
            reference_number: salesOrder.reference_number,
            customer_name: salesOrder.customer_name,
            customer_id: salesOrder.customer_id,
            date: salesOrder.date,
            status: salesOrder.status
        });

        // 2. Find booking by reference_number or customer
        const referenceNumber = salesOrder.reference_number;
        let booking = null;
        let bookingError = null;

        if (referenceNumber) {
            console.log(`\n🔍 Searching for booking with code: ${referenceNumber}`);
            const result = await serviceClient
                .from("bookings")
                .select(`
                    id,
                    external_code,
                    status,
                    kommo_status_id,
                    zoho_sales_order_id,
                    sales_order_url,
                    channel,
                    created_at,
                    updated_at,
                    clients (id, name, email, zoho_contact_id)
                `)
                .eq("external_code", referenceNumber)
                .single();
            
            booking = result.data;
            bookingError = result.error;
        }

        // If not found by reference, try by customer
        if (!booking && salesOrder.customer_id) {
            console.log(`\n🔍 Reference number not found, searching by Zoho customer ID: ${salesOrder.customer_id}`);
            
            // Get contact details from Zoho
            const zohoContact = await getContactById(salesOrder.customer_id);
            if (zohoContact) {
                console.log(`✅ Found Zoho contact: ${zohoContact.contact_name}`);
                const contactEmail = zohoContact.contact_persons?.[0]?.email || zohoContact.email;
                console.log(`   Email: ${contactEmail || "not found"}`);
                
                // Try to find client by zoho_contact_id first
                let client = null;
                const { data: clientByZohoId } = await serviceClient
                    .from("clients")
                    .select("id, name, email, zoho_contact_id")
                    .eq("zoho_contact_id", salesOrder.customer_id)
                    .single();
                
                client = clientByZohoId;

                // If not found, try by email
                if (!client && contactEmail) {
                    console.log(`   Searching by email: ${contactEmail}`);
                    const { data: clientByEmail } = await serviceClient
                        .from("clients")
                        .select("id, name, email, zoho_contact_id")
                        .eq("email", contactEmail)
                        .single();
                    
                    client = clientByEmail;
                }

                if (client) {
                    console.log(`✅ Found client in database: ${client.name} (${client.email})`);
                    
                    // Update client's zoho_contact_id if missing
                    if (!client.zoho_contact_id) {
                        console.log("   Updating client's zoho_contact_id...");
                        await serviceClient
                            .from("clients")
                            .update({ zoho_contact_id: salesOrder.customer_id })
                            .eq("id", client.id);
                    }
                    
                    // Find recent bookings for this client
                    const { data: bookings } = await serviceClient
                        .from("bookings")
                        .select(`
                            id,
                            external_code,
                            status,
                            kommo_status_id,
                            zoho_sales_order_id,
                            sales_order_url,
                            channel,
                            created_at,
                            updated_at,
                            clients (id, name, email, zoho_contact_id)
                        `)
                        .eq("client_id", client.id)
                        .is("zoho_sales_order_id", null)
                        .order("created_at", { ascending: false })
                        .limit(5);

                    if (bookings && bookings.length > 0) {
                        console.log(`\n📋 Found ${bookings.length} booking(s) without sales order for this client:`);
                        bookings.forEach((b: any, idx: number) => {
                            console.log(`  ${idx + 1}. ${b.external_code} - ${b.status} (created: ${b.created_at})`);
                        });
                        
                        // Use the most recent one
                        booking = bookings[0];
                        console.log(`\n✅ Using most recent booking: ${booking.external_code}`);
                    } else {
                        console.log("⚠️  No bookings without sales order found for this client");
                    }
                } else {
                    console.log("⚠️  Client not found in database");
                    console.log(`   Zoho contact: ${zohoContact.contact_name}`);
                    console.log(`   Email: ${contactEmail || "N/A"}`);
                }
            } else {
                console.log("⚠️  Could not fetch contact details from Zoho");
            }
        }

        if (!booking) {
            console.error("\n❌ Could not find booking to sync with this sales order");
            console.log("\n💡 Possible reasons:");
            console.log("   1. Sales order was created manually without linking to a booking");
            console.log("   2. Booking doesn't exist in database");
            console.log("   3. Client in Zoho doesn't match client in database");
            console.log("\n💡 Solution: Manually update the booking's zoho_sales_order_id field");
            return;
        }

        console.log("✅ Booking found:");
        console.log({
            id: booking.id,
            external_code: booking.external_code,
            status: booking.status,
            kommo_status_id: booking.kommo_status_id,
            current_zoho_sales_order_id: booking.zoho_sales_order_id,
            channel: booking.channel
        });

        // 3. Check if already synced
        if (booking.zoho_sales_order_id === ZOHO_SALES_ORDER_ID) {
            console.log("\n✅ Booking already has this sales order ID. Already synced!");
            return;
        }

        if (booking.zoho_sales_order_id && booking.zoho_sales_order_id !== ZOHO_SALES_ORDER_ID) {
            console.log(`\n⚠️  Booking already has a different sales order ID: ${booking.zoho_sales_order_id}`);
            console.log("   This might be a duplicate or manual override.");
        }

        // 4. Update booking with sales order info
        const salesOrderUrl = `https://books.zoho.com/app/${orgId}#/salesorders/${ZOHO_SALES_ORDER_ID}`;
        
        console.log("\n📝 Updating booking with sales order info...");
        const { error: updateError } = await serviceClient
            .from("bookings")
            .update({
                zoho_sales_order_id: ZOHO_SALES_ORDER_ID,
                sales_order_url: salesOrderUrl
            })
            .eq("id", booking.id);

        if (updateError) {
            console.error("❌ Failed to update booking:", updateError);
            return;
        }

        console.log("✅ Booking updated successfully!");
        console.log(`   Sales Order URL: ${salesOrderUrl}`);

        // 5. Log timeline event
        console.log("\n📜 Creating timeline event...");
        const { error: timelineError } = await serviceClient
            .from("booking_timeline_events")
            .insert({
                booking_id: booking.id,
                event_type: "system",
                message: `Manually synced Zoho Sales Order: ${ZOHO_SALES_ORDER_ID} (${salesOrder.salesorder_number})`,
                payload: {
                    sales_order_id: ZOHO_SALES_ORDER_ID,
                    sales_order_number: salesOrder.salesorder_number,
                    synced_at: new Date().toISOString(),
                    source: "manual_sync"
                }
            });

        if (timelineError) {
            console.warn("⚠️  Failed to create timeline event:", timelineError);
        } else {
            console.log("✅ Timeline event created");
        }

        console.log("\n🎉 Sync completed successfully!");

    } catch (error: any) {
        console.error("❌ Error:", error.message || error);
        console.error(error);
    }
}

syncManualSalesOrder();
