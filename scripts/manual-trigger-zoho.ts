
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

async function main() {
    const bookingId = "55c59848-bbe8-47ec-af06-e96afb480e8b" // Found from timeline inspection
    console.log(`Manually triggering Sales Order creation for booking: ${bookingId}`)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch Booking
    const { data: booking } = await serviceClient
        .from("bookings")
        .select(`
            *,
            clients ( * ),
            staff_accounts ( full_name, email ),
            vehicles ( name, plate_number )
        `)
        .eq("id", bookingId)
        .single()

    if (!booking) {
        console.error("Booking not found")
        return
    }

    // Fetch additional services
    const { data: bookingServices } = await serviceClient
        .from("booking_additional_services")
        .select(`
            service:additional_services ( name )
        `)
        .eq("booking_id", bookingId);

    // Fetch tasks
    const { data: taskServices } = await serviceClient
        .from("tasks")
        .select(`
            services:task_additional_services (
                service:additional_services ( name )
            )
        `)
        .eq("booking_id", bookingId);

    console.log("Booking:", booking.external_code, booking.status)

    // 2. Import Zoho Libs (Dynamic import in node script)
    const { createSalesOrder, findContactByEmail, createContact, getOrganizationId } = await import("../lib/zoho/books")
    const { sendNotification } = await import("../lib/notifications")
    const { updateKommoLeadStatus } = await import("../lib/kommo/client")

    // Check if SO exists
    if (booking.zoho_sales_order_id) {
        console.log("Sales Order already exists:", booking.zoho_sales_order_id)
    } else {
        const client = booking.clients
        if (!client || !client.email) {
            console.error("Client email missing")
            return
        }

        // FORCE RESET CONTACT ID for testing/fixing bad data
        // If the contact ID stored is a Vendor, we need to find the Customer one.
        console.log("Current Client Zoho ID:", client.zoho_contact_id)
        let contactId = null; // Ignore DB value to force re-search with new filter

        // Find/Create Contact
        if (!contactId) {
            console.log("Searching Zoho Contact by email:", client.email)
            const existing = await findContactByEmail(client.email)
            if (existing) {
                contactId = existing.contact_id
                console.log("Found Contact:", contactId)
                // Update client
                await serviceClient.from("clients").update({ zoho_contact_id: contactId }).eq("id", client.id)
            } else {
                console.log("Creating Zoho Contact...")
                const contactData = {
                    contact_name: client.name,
                    contact_persons: [{
                        first_name: client.name.split(" ")[0],
                        last_name: client.name.split(" ").slice(1).join(" ") || "-",
                        email: client.email,
                        phone: client.phone,
                        is_primary_contact: true
                    }]
                }
                const newContact = await createContact(contactData)
                if (newContact.code !== 0) {
                    console.error("Failed to create contact:", newContact.message)
                    return
                }
                contactId = newContact.contact.contact_id
                await serviceClient.from("clients").update({ zoho_contact_id: contactId }).eq("id", client.id)
            }
        }

        // Prepare Items
        const lineItems = [
            {
                name: `Rental Service - ${booking.external_code}`,
                rate: booking.total_amount,
                quantity: 1,
                tax_id: "6183693000000229181" // VAT 5% (Check your ID)
            }
        ]

        const customFields = [
            { customfield_id: "6183693000001829012", value: booking.start_at?.split("T")[0] }, 
            { customfield_id: "6183693000001829002", value: booking.end_at?.split("T")[0] }, 
            { customfield_id: "6183693000001829066", value: booking.delivery_location || "" },
            { customfield_id: "6183693000001869037", value: booking.mileage_limit || "" }
        ]

        if (booking.advance_payment) {
            customFields.push({
                customfield_id: "6183693000002201003",
                value: String(booking.advance_payment)
            })
        }

        const TERMS_AND_CONDITIONS = `Thank you for choosing us! To secure your booking, please complete the advance payment using the secure link below.

Cancellation Policy:
Free cancellation 7 days before pickup → Full refund.
Non-refundable if cancelled 7 days before pickup.

By proceeding, you agree to these terms and authorize us to hold the vehicle just for you.

Need help before paying? We’re here for you—Text us on whatsapp anytime!`;

        const orderData = {
            customer_id: contactId,
            salesperson_id: "6183693000000293023", // Aleksei default
            date: new Date().toISOString().split("T")[0],
            reference_number: booking.external_code,
            line_items: lineItems,
            custom_fields: customFields,
            status: "draft",
            terms: TERMS_AND_CONDITIONS
        }

        console.log("Creating Sales Order...")
        const orderRes = await createSalesOrder(orderData)

        if (orderRes.code !== 0) {
            console.error("Failed to create SO:", orderRes.message)
            await sendNotification('telegram', {
                message: `❌ <b>Sales Order Creation Failed (Manual)</b>\n\n<b>Booking:</b> ${booking.external_code}\n<b>Client:</b> ${client.name}\n<b>Auto:</b> ${booking.vehicles?.name || "N/A"}\n<b>Plate:</b> ${booking.vehicles?.plate_number || "N/A"}\n<b>Error:</b> ${orderRes.message}`
            })
            return
        }

        const salesOrderId = orderRes.salesorder.salesorder_id
        const orgId = await getOrganizationId()
        const salesOrderUrl = `https://books.zoho.com/app/${orgId}#/salesorders/${salesOrderId}`

        console.log("Success! URL:", salesOrderUrl)

        await serviceClient.from("bookings").update({
            zoho_sales_order_id: salesOrderId,
            sales_order_url: salesOrderUrl
        }).eq("id", bookingId)

        // Notification
        // Collect service names for notification
        const serviceNames: string[] = [];
        if (bookingServices && bookingServices.length > 0) {
            bookingServices.forEach((as: any) => {
                if (as.service?.name) serviceNames.push(as.service.name);
            });
        }
        if (taskServices && taskServices.length > 0) {
            taskServices.forEach((task: any) => {
                if (task.services && task.services.length > 0) {
                    task.services.forEach((as: any) => {
                        if (as.service?.name) serviceNames.push(`${as.service.name} (Task)`);
                    });
                }
            });
        }
        const servicesText = serviceNames.length > 0 ? `\n<b>Services:</b> ${serviceNames.join(", ")}` : "";

        await sendNotification('telegram', {
            message: `✅ <b>Sales Order Created (Manual)</b>\n\n<b>Booking:</b> ${booking.external_code}\n<b>Sales Order:</b> <a href="${salesOrderUrl}">Link</a>\n<b>Client:</b> ${client.name}\n<b>Auto:</b> ${booking.vehicles?.name || "N/A"}\n<b>Plate:</b> ${booking.vehicles?.plate_number || "N/A"}\n<b>Amount:</b> ${booking.total_amount} AED${servicesText}`
        })
    }

    // Update Kommo (Running this even if SO existed, to ensure status is correct)
    if (booking.source_payload_id?.startsWith("kommo:")) {
        const leadId = booking.source_payload_id.replace("kommo:", "")
        const advancePayment = Number(booking.advance_payment || 0)
        const targetStatusId = advancePayment > 0 ? "96150292" : "75440391"
        console.log(`Updating Kommo Lead ${leadId} to status ${targetStatusId} (Advance: ${advancePayment})`)
        await updateKommoLeadStatus(leadId, targetStatusId)
    }
}

main()
