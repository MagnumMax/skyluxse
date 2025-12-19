
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import { createSalesOrder, createContact, findContactByEmail, getOrganizationId } from "../lib/zoho/books"

dotenv.config({ path: ".env.local" })

const BOOKING_ID = "a96ec745-d4c5-4ffa-bda4-ca85b7321386"

async function main() {
    console.log(`Starting Test for Booking: ${BOOKING_ID}`)

    const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: bookingRaw, error } = await serviceClient
        .from("bookings")
        .select(`
            *,
            staff_accounts ( full_name, email ),
            clients ( * )
        `)
        .eq("id", BOOKING_ID)
        .single()

    if (error || !bookingRaw) {
        console.error("Fetch error", error)
        return
    }

    const client = bookingRaw.clients
    const ownerName = bookingRaw.staff_accounts?.full_name

    let clientEmail = client?.email
    if (!clientEmail || !clientEmail.includes("@")) {
        // Should actally fix DB but assuming valid for this test (we know it's rejwan...)
        console.warn("Invalid email in DB, using existing client info logic or failing.")
    }
    console.log(`Client: ${client?.name}, Email: "${clientEmail}", Owner: ${ownerName}`)

    // 1. Find/Create Contact
    let contactId = null
    const existing = await findContactByEmail(clientEmail)
    if (existing) {
        console.log(`Found Zoho Contact: ${existing.contact_name}`)
        contactId = existing.contact_id
    } else {
        console.log("Creating Zoho Contact...")
        // ... (Skipping creation logic for brevity as we know contact exists from previous test)
        // If not exists, this script might fail, but we know it exists.
    }

    // 2. Fetch Vehicle Zoho Item ID
    const { data: vehicle } = await serviceClient
        .from("vehicles")
        .select("id, name, plate_number, zoho_item_id")
        .eq("id", bookingRaw.vehicle_id)
        .single()
    const itemId = vehicle?.zoho_item_id
    console.log(`Car ID (vehicle_id): ${bookingRaw.vehicle_id}`)
    console.log(`Vehicle in DB: ${vehicle?.name} (${vehicle?.plate_number})`)
    console.log(`Vehicle Item ID: ${itemId}`)

    // 3. Prepare Payload
    const lineItems = [
        {
            item_id: itemId || undefined,
            ...(itemId ? {} : { name: `Car Rental - ${bookingRaw.car_name || 'Vehicle'}` }),
            description: `Booking ${bookingRaw.external_code}`,
            rate: bookingRaw.total_amount,
            quantity: 1
        }
    ];

    const customFields = [
        { customfield_id: "6183693000001829012", value: bookingRaw.start_at?.split("T")[0] }, // Pick Up
        { customfield_id: "6183693000001829002", value: bookingRaw.end_at?.split("T")[0] }, // Drop Off
        { customfield_id: "6183693000001829066", value: bookingRaw.delivery_location || "" },
        { customfield_id: "6183693000001869037", value: bookingRaw.mileage_limit || "" }
    ];

    if (bookingRaw.advance_payment) {
        customFields.push({
            customfield_id: "6183693000002201003",
            value: bookingRaw.advance_payment
        });
    }

    const orderData = {
        customer_id: contactId,
        salesperson_id: "6183693000000293023", // Aleksei (Verified)
        date: bookingRaw.start_at ? bookingRaw.start_at.split("T")[0] : new Date().toISOString().split("T")[0],
        reference_number: bookingRaw.external_code + "-TEST-ITEM",
        status: "draft",
        line_items: lineItems,
        custom_fields: customFields
    };

    console.log("Sending Order Payload:", JSON.stringify(orderData, null, 2))

    const orderRes = await createSalesOrder(orderData)

    if (orderRes.code === 0) {
        console.log("SUCCESS! Sales Order Created.")
        console.log(`ID: ${orderRes.salesorder.salesorder_id}`)
        console.log(`URL: https://books.zoho.com/app/${await getOrganizationId()}#/salesorders/${orderRes.salesorder.salesorder_id}`)
    } else {
        console.error("FAILED to create Sales Order:", orderRes.message, orderRes)
    }
}

main()
