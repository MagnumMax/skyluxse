
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import { createSalesOrder, createContact, findContactByEmail, getOrganizationId } from "../lib/zoho/books"

dotenv.config({ path: ".env.local" })

const KOMMO_LEAD_ID = 20233357 // Only this ID changed
const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!KOMMO_BASE_URL || !KOMMO_ACCESS_TOKEN) {
    console.error("Missing Kommo Env Vars")
    process.exit(1)
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

// --- Kommo Helpers ---

const KOMMO_DELIVERY_FIELD_ID = Number(process.env.KOMMO_DELIVERY_FIELD_ID ?? "1218176")
const KOMMO_COLLECT_FIELD_ID = Number(process.env.KOMMO_COLLECT_FIELD_ID ?? "1218178")

const KOMMO_FIELD_IDS = {
    deliveryLocation: 1218182,
    collectLocation: 1234165,
    deliveryFee: 1234177,
    durationDays: 1234173,
    priceDaily: 1232960,
    insuranceFee: 1234175,
    fullInsuranceFee: 1234179,
    advancePayment: 1233272,
    salesOrderUrl: 1224030,
    agreementNumber: 806190,
    kmLimit: 1235349,
}

function asString(value: unknown): string | null {
    if (value == null) return null
    if (typeof value === "string") {
        const trimmed = value.trim()
        return trimmed.length ? trimmed : null
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return value.toString()
    }
    return null
}

function findCustomField(entity: any, fieldId: number) {
    if (!entity?.custom_fields_values) return null
    return entity.custom_fields_values.find((f: any) => Number(f.field_id) === fieldId)
}

function extractStringField(entity: any, fieldId: number): string | null {
    const field = findCustomField(entity, fieldId)
    const val = field?.values?.[0]?.value
    return asString(val)
}

function extractNumericField(entity: any, fieldId: number): number | null {
    const str = extractStringField(entity, fieldId)
    if (!str) return null
    const num = Number(str)
    return Number.isFinite(num) ? num : null
}

function extractIntegerField(entity: any, fieldId: number): number | null {
    const num = extractNumericField(entity, fieldId)
    return num != null ? Math.round(num) : null
}

function extractKommoEpoch(lead: any, fieldId: number): string | null {
    if (!fieldId) return null
    const field = findCustomField(lead, fieldId)
    if (!field) return null
    const values = field.values || []
    for (const entry of values) {
        const raw = asString(entry?.value ?? entry?.enum_code ?? entry?.enum)
        if (!raw) continue
        const numeric = Number(raw)
        if (Number.isFinite(numeric)) {
            return new Date(numeric * 1000).toISOString()
        }
    }
    return null
}

async function main() {
    console.log(`Starting Sync & Create SO for Kommo Lead: ${KOMMO_LEAD_ID}`)

    // 1. Fetch Staff Map
    const { data: staffData } = await serviceClient
        .from("staff_accounts")
        .select("id, external_crm_id")
        .not("external_crm_id", "is", null)

    const staffMap = new Map<string, string>()
    staffData?.forEach((s) => {
        if (s.external_crm_id) staffMap.set(s.external_crm_id, s.id)
    })

    // 2. Fetch Lead from Kommo
    console.log("Fetching lead from Kommo...")
    const leadResp = await fetch(`${KOMMO_BASE_URL}/api/v4/leads/${KOMMO_LEAD_ID}?with=custom_fields`, {
        headers: { Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}` }
    })

    if (!leadResp.ok) {
        console.error(`Failed to fetch lead: ${leadResp.status} ${leadResp.statusText}`)
        return
    }

    const lead = await leadResp.json()
    console.log(`Lead fetched. Name: ${lead.name}`)

    const startAt = extractKommoEpoch(lead, KOMMO_DELIVERY_FIELD_ID) ?? extractKommoEpoch(lead, KOMMO_COLLECT_FIELD_ID)
    const endAt = extractKommoEpoch(lead, KOMMO_COLLECT_FIELD_ID) ?? startAt ?? null
    const ownerId = lead.responsible_user_id ? staffMap.get(String(lead.responsible_user_id)) : null

    const updates: any = {
        start_at: startAt,
        end_at: endAt,
        delivery_location: extractStringField(lead, KOMMO_FIELD_IDS.deliveryLocation),
        collect_location: extractStringField(lead, KOMMO_FIELD_IDS.collectLocation),
        delivery_fee_label: extractStringField(lead, KOMMO_FIELD_IDS.deliveryFee),
        insurance_fee_label: extractStringField(lead, KOMMO_FIELD_IDS.insuranceFee),
        rental_duration_days: extractIntegerField(lead, KOMMO_FIELD_IDS.durationDays),
        price_daily: extractNumericField(lead, KOMMO_FIELD_IDS.priceDaily),
        full_insurance_fee: extractNumericField(lead, KOMMO_FIELD_IDS.fullInsuranceFee),
        advance_payment: extractNumericField(lead, KOMMO_FIELD_IDS.advancePayment),
        sales_order_url: extractStringField(lead, KOMMO_FIELD_IDS.salesOrderUrl),
        agreement_number: extractStringField(lead, KOMMO_FIELD_IDS.agreementNumber),
        mileage_limit: extractStringField(lead, KOMMO_FIELD_IDS.kmLimit),
        // price: lead.price // Should we sync price? Usually 'price' is the deal value.
    }

    if (lead.price) {
        updates.total_amount = lead.price
    }

    if (ownerId) {
        updates.owner_id = ownerId
    }

    // Clean undefined
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key])

    console.log("Updating Booking with:", JSON.stringify(updates, null, 2))

    // 3. Update Supabase
    // We assume the booking exists with external_code = 'K-' + ID
    const externalCode = `K-${KOMMO_LEAD_ID}`

    // First, check if booking exists
    const { data: existingBooking, error: fetchError } = await serviceClient
        .from("bookings")
        .select("id")
        .eq("external_code", externalCode)
        .single()

    if (fetchError || !existingBooking) {
        console.error(`Booking with code ${externalCode} not found in Supabase!`)
        // Potentially create it? The user said "update booking".
        return
    }

    const { data: updatedBooking, error: updateError } = await serviceClient
        .from("bookings")
        .update(updates)
        .eq("id", existingBooking.id)
        .select(`
            *,
            staff_accounts ( full_name, email ),
            clients ( * )
        `)
        .single()

    if (updateError) {
        console.error("Failed to update booking:", updateError)
        return
    }

    console.log("Booking Updated Successfully.")

    // 4. Create Sales Order
    console.log("Creating Zoho Sales Order...")

    const bookingRaw = updatedBooking
    const client = bookingRaw.clients

    if (!client || !client.email) {
        console.error("Client email missing, cannot create Sales Order")
        return
    }

    // A. Find/Create Contact
    let contactId = null
    const existingContact = await findContactByEmail(client.email)
    if (existingContact) {
        console.log(`Found Zoho Contact: ${existingContact.contact_name}`)
        contactId = existingContact.contact_id
    } else {
        console.log("Creating Zoho Contact...")
        const contactData = {
            contact_name: client.name,
            contact_persons: [{
                first_name: client.name.split(" ")[0],
                last_name: client.name.split(" ").slice(1).join(" ") || "Client",
                email: client.email,
                phone: client.phone,
                is_primary_contact: true
            }]
        };
        const newContactRes = await createContact(contactData);
        if (newContactRes.code === 0) {
            contactId = newContactRes.contact.contact_id;
        } else {
            console.error("Failed to create Zoho Contact: " + newContactRes.message);
            return
        }
    }

    // B. Get Vehicle Item
    const { data: vehicle } = await serviceClient
        .from("vehicles")
        .select("zoho_item_id, plate_number, name")
        .eq("id", bookingRaw.vehicle_id)
        .single()

    const itemId = vehicle?.zoho_item_id

    // C. Payload
    // Calculate Duration
    const { format } = await import("date-fns"); // Dynamic import for script

    let quantity = 1;
    let startStr = "";
    let endStr = "";

    if (bookingRaw.start_at && bookingRaw.end_at) {
        const start = new Date(bookingRaw.start_at);
        const end = new Date(bookingRaw.end_at);
        const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (days > 0) quantity = days;

        startStr = format(start, "dd.MM.yyyy HH:mm");
        endStr = format(end, "dd.MM.yyyy HH:mm");
    }

    const rate = bookingRaw.price_daily || (bookingRaw.total_amount ? bookingRaw.total_amount / quantity : 0);

    const lineItems = [
        {
            item_id: itemId || undefined,
            ...(itemId ? {} : { name: `Car Rental - ${bookingRaw.car_name || 'Vehicle'}` }),
            description: `${startStr} - ${endStr}`,
            rate: rate,
            quantity: quantity,
            tax_id: "6183693000000229181" // Standard Rate 5%
        }
    ];

    // Helper to extract fee amount from label
    function extractFee(label: string | null | undefined): number {
        if (!label) return 0;
        const match = label.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    // Delivery Fee
    const ITEM_DELIVERY_CHARGE_ID = "6183693000000251070";
    if (bookingRaw.delivery_fee_label) {
        const deliveryFee = extractFee(bookingRaw.delivery_fee_label);
        if (deliveryFee > 0) {
            lineItems.push({
                item_id: ITEM_DELIVERY_CHARGE_ID,
                name: "Delivery Charge",
                description: "",
                rate: deliveryFee,
                quantity: 1,
                tax_id: "6183693000000229181"
            });
        }
    }

    // No Deposit Fee
    const ITEM_NO_DEPOSIT_FEE_ID = "6183693000000251092";
    if (bookingRaw.insurance_fee_label && bookingRaw.insurance_fee_label.toLowerCase().includes("no deposit")) {
        const noDepositFee = extractFee(bookingRaw.insurance_fee_label);
        if (noDepositFee > 0) {
            lineItems.push({
                item_id: ITEM_NO_DEPOSIT_FEE_ID,
                name: "No Deposit Fixed Fee",
                description: "",
                rate: noDepositFee,
                quantity: 1,
                tax_id: "6183693000000229181"
            });
        }
    }

    // CDW Insurance (Full Insurance Fee)
    const ITEM_CDW_INSURANCE_ID = "6183693000002576237";
    if (bookingRaw.full_insurance_fee && bookingRaw.full_insurance_fee > 0) {
        lineItems.push({
            item_id: ITEM_CDW_INSURANCE_ID,
            name: "CDW Insurance",
            description: "",
            rate: bookingRaw.full_insurance_fee,
            quantity: 1,
            tax_id: "6183693000000229181"
        });
    }

    const customFields = [
        { customfield_id: "6183693000001829012", value: bookingRaw.start_at?.split("T")[0] }, // Pick Up
        { customfield_id: "6183693000001829002", value: bookingRaw.end_at?.split("T")[0] }, // Drop Off
        { customfield_id: "6183693000001829066", value: bookingRaw.delivery_location || "" },
        { customfield_id: "6183693000001869037", value: bookingRaw.mileage_limit || "" }
    ];

    if (bookingRaw.advance_payment) {
        customFields.push({
            customfield_id: "6183693000002201003",
            value: String(bookingRaw.advance_payment)
        });
    }

    // Resolve Salesperson
    const SALESPERSON_MAP: Record<string, string> = {
        "aleksei": "6183693000000293023",
        "danil": "6183693000000293150",
        "konstantin": "6183693000000293152",
        "siddharth": "6183693000001836001",
        "elena": "6183693000002460005"
    };

    let salespersonId = "";
    if (bookingRaw.staff_accounts?.full_name) {
        const normalizedOwner = bookingRaw.staff_accounts.full_name.toLowerCase();
        for (const [key, id] of Object.entries(SALESPERSON_MAP)) {
            if (normalizedOwner.includes(key)) {
                salespersonId = id;
                break;
            }
        }
    }
    if (!salespersonId) salespersonId = "6183693000000293023"; // Aleksei Default

    const TERMS_AND_CONDITIONS = `Thank you for choosing us! To secure your booking, please complete the advance payment using the secure link below.

Cancellation Policy:
Free cancellation 7 days before pickup → Full refund.
Non-refundable if cancelled 7 days before pickup.

By proceeding, you agree to these terms and authorize us to hold the vehicle just for you.

Need help before paying? We’re here for you—Text us on whatsapp anytime!`;

    const orderData = {
        customer_id: contactId,
        salesperson_id: salespersonId,
        date: new Date().toISOString().split("T")[0], // Order Date = Creation Date
        reference_number: externalCode,
        line_items: lineItems,
        custom_fields: customFields,
        terms: TERMS_AND_CONDITIONS
    };

    console.log("Sending Order Payload:", JSON.stringify(orderData, null, 2))

    const orderRes = await createSalesOrder(orderData)

    if (orderRes.code === 0) {
        const soId = orderRes.salesorder.salesorder_id
        const orgId = await getOrganizationId()
        const salesOrderUrl = `https://books.zoho.com/app/${orgId}#/salesorders/${soId}`

        console.log("SUCCESS! Sales Order Created.")
        console.log(`URL: ${salesOrderUrl}`)

        // Update Booking with SO info
        await serviceClient
            .from("bookings")
            .update({
                zoho_sales_order_id: soId,
                sales_order_url: salesOrderUrl
            })
            .eq("id", bookingRaw.id)

        console.log("Booking updated with Sales Order URL.")

    } else {
        console.error("FAILED to create Sales Order:", orderRes.message, orderRes)
    }

}

main()
