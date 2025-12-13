
import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { updateSalesOrder, getBooksClient, getOrganizationId } from "../lib/zoho/books";
import { format, differenceInDays, parseISO } from "date-fns";

const BOOKING_ID = "55c59848-bbe8-47ec-af06-e96afb480e8b";
const SALES_ORDER_ID = "6183693000004355002";

const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixSalesOrder() {
    console.log(`\n🔧 Fixing Sales Order: ${SALES_ORDER_ID} for Booking: ${BOOKING_ID}\n`);

    try {
        // 1. Fetch Booking Data
        const { data: booking, error } = await serviceClient
            .from("bookings")
            .select(`
                *,
                vehicle:vehicles (
                    id,
                    name,
                    zoho_item_id
                ),
                client:clients (
                    id,
                    name,
                    email
                )
            `)
            .eq("id", BOOKING_ID)
            .single();

        if (error || !booking) {
            console.error("❌ Failed to fetch booking:", error);
            return;
        }

        console.log(`✅ Booking found: ${booking.external_code}`);

        // 2. Fetch Additional Services
        const { data: additionalServices } = await serviceClient
            .from("booking_additional_services")
            .select(`
                price,
                description,
                quantity,
                service:additional_services (
                    name
                )
            `)
            .eq("booking_id", BOOKING_ID);

        console.log(`✅ Found ${additionalServices?.length || 0} additional services`);

        // 3. Reconstruct Line Items
        let quantity = 1;
        let startStr = "";
        let endStr = "";

        if (booking.start_at && booking.end_at) {
            const start = parseISO(booking.start_at);
            const end = parseISO(booking.end_at);
            const days = differenceInDays(end, start);
            if (days > 0) quantity = days;

            startStr = format(start, "dd.MM.yyyy HH:mm");
            endStr = format(end, "dd.MM.yyyy HH:mm");
        }

        const rate = booking.price_daily || (booking.total_amount ? booking.total_amount / quantity : 0);

        const lineItems = [
            {
                item_id: booking.vehicle?.zoho_item_id || undefined,
                ...(booking.vehicle?.zoho_item_id ? {} : { name: `Car Rental - ${booking.vehicle?.name}` }),
                description: `${startStr} - ${endStr}`,
                rate: rate,
                quantity: quantity,
                tax_id: "6183693000000229181" // Standard Rate 5%
            }
        ];

        // Add additional services
        if (additionalServices && additionalServices.length > 0) {
            additionalServices.forEach((as: any) => {
                console.log(`   + Adding service: ${as.service?.name} (Qty: ${as.quantity || 1}, Price: ${as.price})`);
                lineItems.push({
                    item_id: undefined,
                    name: as.service?.name || "Additional Service",
                    description: as.description || "",
                    rate: as.price,
                    quantity: as.quantity || 1,
                    tax_id: "6183693000000229181"
                });
            });
        }

        // Add standard fees
        function extractFee(label: string | null | undefined): number {
            if (!label) return 0;
            const match = label.match(/(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        }

        // Delivery Fee
        const ITEM_DELIVERY_CHARGE_ID = "6183693000000251070";
        if (booking.delivery_fee_label) {
            const deliveryFee = extractFee(booking.delivery_fee_label);
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
        if (booking.insurance_fee_label && booking.insurance_fee_label.toLowerCase().includes("no deposit")) {
            const noDepositFee = extractFee(booking.insurance_fee_label);
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

        // CDW Insurance
        const ITEM_CDW_INSURANCE_ID = "6183693000002576237";
        if (booking.full_insurance_fee && booking.full_insurance_fee > 0) {
            lineItems.push({
                item_id: ITEM_CDW_INSURANCE_ID,
                name: "CDW Insurance",
                description: "",
                rate: booking.full_insurance_fee,
                quantity: 1,
                tax_id: "6183693000000229181"
            });
        }

        // 4. Update Zoho
        console.log("\n📤 Sending update to Zoho...");
        const updateData = {
            line_items: lineItems
        };
        
        // Fetch existing SO to preserve other fields? 
        // Zoho Update API usually does a partial update but for line_items it replaces them entirely.
        // We should double check if we need other required fields.
        // Usually for update, we can just send the fields we want to change.
        
        const response = await updateSalesOrder(SALES_ORDER_ID, updateData);
        
        if (response.code === 0) {
            console.log("✅ Sales Order updated successfully!");
        } else {
            console.error("❌ Failed to update Sales Order:", response.message);
            console.error(JSON.stringify(response, null, 2));
        }

    } catch (error: any) {
        console.error("❌ Error:", error.message || error);
    }
}

fixSalesOrder();
