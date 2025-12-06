"use server";

import { createZohoClient, createZohoOrder } from "@/lib/zoho/client";

export async function createClientAction(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
}) {
    try {
        const response = await createZohoClient({
            FirstName: data.firstName,
            LastName: data.lastName,
            Email: data.email,
            Phone: data.phone,
        });

        // Parse response to return something serializable
        // This part needs careful handling of the SDK response object
        return { success: true, data: JSON.parse(JSON.stringify(response)) };
    } catch (error: any) {
        console.error("Failed to create Zoho client:", error);
        return { success: false, error: error.message };
    }
}

export async function createOrderAction(data: {
    subject: string;
    contactId: string;
    products: { productId: string; quantity: number; unitPrice: number }[];
}) {
    try {
        const response = await createZohoOrder({
            Subject: data.subject,
            ContactId: data.contactId,
            ProductDetails: data.products.map(p => ({
                ProductId: p.productId,
                Quantity: p.quantity,
                UnitPrice: p.unitPrice
            }))
        });
        return { success: true, data: JSON.parse(JSON.stringify(response)) };
    } catch (error: any) {
        console.error("Failed to create Zoho order:", error);
        return { success: false, error: error.message || "Unknown error" };
    }
}

export async function createInvoiceAction(invoiceData: any) {
    try {
        const { createInvoice } = await import("../../lib/zoho/books");
        const response = await createInvoice(invoiceData);

        if (response.code === 0) {
            return { success: true, data: response };
        } else {
            return { success: false, error: response.message };
        }
    } catch (error: any) {
        console.error("Failed to create Zoho invoice:", error);
        return { success: false, error: error.message || "Unknown error" };
    }
}

export async function createSalesOrderAction(orderData: any) {
    try {
        const { createSalesOrder } = await import("../../lib/zoho/books");
        const response = await createSalesOrder(orderData);

        if (response.code === 0) {
            return { success: true, data: response };
        } else {
            return { success: false, error: response.message };
        }
    } catch (error: any) {
        console.error("Failed to create Zoho sales order:", error);
        return { success: false, error: error.message || "Unknown error" };
    }
}

export async function createSalesOrderForBooking(bookingId: string) {
    try {
        const { getLiveBookingById, getLiveClientById } = await import("@/lib/data/live-data");
        const { createSalesOrder, findContactByEmail, createContact, getOrganizationId } = await import("@/lib/zoho/books");
        const { serviceClient } = await import("@/lib/supabase/service-client");
        const { revalidatePath } = await import("next/cache");

        const booking = await getLiveBookingById(bookingId);
        if (!booking) throw new Error("Booking not found");

        const client = booking.clientId ? await getLiveClientById(String(booking.clientId)) : null;
        if (!client) throw new Error("Client not found for this booking");

        if (!client.email) throw new Error("Client email is missing");

        // 1. Find or Create Contact in Zoho
        let contactId = null;
        const existingContact = await findContactByEmail(client.email);

        if (existingContact) {
            contactId = existingContact.contact_id;
        } else {
            // Create new contact
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
                throw new Error("Failed to create Zoho Contact: " + newContactRes.message);
            }
        }

        // 2. Create Sales Order

        // Resolve Salesperson
        // Extracted from Zoho Salespersons list (Step 600)
        const SALESPERSON_MAP: Record<string, string> = {
            "aleksei": "6183693000000293023",
            "danil": "6183693000000293150",
            "konstantin": "6183693000000293152",
            "siddharth": "6183693000001836001",
            "elena": "6183693000002460005"
        };

        let salespersonId = "";
        if (booking.ownerName) {
            const normalizedOwner = booking.ownerName.toLowerCase();
            for (const [key, id] of Object.entries(SALESPERSON_MAP)) {
                if (normalizedOwner.includes(key)) {
                    salespersonId = id;
                    break;
                }
            }
        }

        // Fallback to Aleksei if no match found (or if Alisher etc are not in list), as field is mandatory
        if (!salespersonId) {
            salespersonId = "6183693000000293023"; // Aleksei Default
        }

        // 1. Fetch Vehicle Zoho Item ID
        const { data: vehicleData } = await serviceClient
            .from("vehicles")
            .select("zoho_item_id")
            .eq("id", booking.carId)
            .single();

        const zohoItemId = vehicleData?.zoho_item_id;

        const { differenceInDays, parseISO, format } = await import("date-fns");

        let quantity = 1;
        let startStr = "";
        let endStr = "";

        if (booking.startDate && booking.endDate) {
            const start = parseISO(booking.startDate);
            const end = parseISO(booking.endDate);
            const days = differenceInDays(end, start);
            if (days > 0) quantity = days;

            startStr = format(start, "dd.MM.yyyy HH:mm");
            endStr = format(end, "dd.MM.yyyy HH:mm");
        }

        const rate = booking.priceDaily || (booking.totalAmount ? booking.totalAmount / quantity : 0);

        const lineItems = [
            {
                item_id: zohoItemId || undefined, // Use Item ID if available
                ...(zohoItemId ? {} : { name: `Car Rental - ${booking.carName}` }), // Only send name if no Item ID (let Zoho use default)
                description: `${startStr} - ${endStr}`,
                rate: rate,
                quantity: quantity,
                tax_id: "6183693000000229181" // Standard Rate 5%
            }
        ];

        // Helper to extract fee amount from label (e.g. "Delivery Fee- 200 aed" -> 200)
        function extractFee(label: string | null | undefined): number {
            if (!label) return 0;
            const match = label.match(/(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        }

        // Delivery Fee
        const ITEM_DELIVERY_CHARGE_ID = "6183693000000251070";
        if (booking.deliveryFeeLabel) {
            const deliveryFee = extractFee(booking.deliveryFeeLabel);
            if (deliveryFee > 0) {
                lineItems.push({
                    item_id: ITEM_DELIVERY_CHARGE_ID,
                    name: "Delivery Charge", // Optional, Zoho fills it
                    description: "",
                    rate: deliveryFee,
                    quantity: 1,
                    tax_id: "6183693000000229181"
                });
            }
        }

        // No Deposit Fee
        const ITEM_NO_DEPOSIT_FEE_ID = "6183693000000251092";
        if (booking.insuranceFeeLabel && booking.insuranceFeeLabel.toLowerCase().includes("no deposit")) {
            const noDepositFee = extractFee(booking.insuranceFeeLabel);
            if (noDepositFee > 0) {
                lineItems.push({
                    item_id: ITEM_NO_DEPOSIT_FEE_ID,
                    name: "No Deposit Fixed Fee", // Optional
                    description: "",
                    rate: noDepositFee,
                    quantity: 1,
                    tax_id: "6183693000000229181"
                });
            }
        }

        // CDW Insurance (Full Insurance Fee)
        const ITEM_CDW_INSURANCE_ID = "6183693000002576237";
        if (booking.fullInsuranceFee && booking.fullInsuranceFee > 0) {
            lineItems.push({
                item_id: ITEM_CDW_INSURANCE_ID,
                name: "CDW Insurance",
                description: "",
                rate: booking.fullInsuranceFee,
                quantity: 1,
                tax_id: "6183693000000229181"
            });
        }

        // Add additional Fees if needed (though totalAmount usually implies inclusive? Check domain logic.
        // If totalAmount is the total price, leave it as one line item for simplicity unless breakdown is required.)

        const customFields = [
            {
                customfield_id: "6183693000001829012", // Pick Up Date
                value: booking.startDate?.split("T")[0]
            },
            {
                customfield_id: "6183693000001829002", // Drop Off Date
                value: booking.endDate?.split("T")[0]
            },
            {
                customfield_id: "6183693000001829066", // Rental Location
                value: booking.deliveryLocation || booking.pickupLocation || ""
            },
            {
                customfield_id: "6183693000001869037", // KM Limit
                value: booking.mileageLimit || ""
            }
        ];

        if (booking.advancePayment) {
            customFields.push({
                customfield_id: "6183693000002201003", // Advance payment
                value: String(booking.advancePayment)
            });
        }

        const TERMS_AND_CONDITIONS = `Thank you for choosing us! To secure your booking, please complete the advance payment using the secure link below.

Cancellation Policy:
Free cancellation 7 days before pickup → Full refund.
Non-refundable if cancelled 7 days before pickup.

By proceeding, you agree to these terms and authorize us to hold the vehicle just for you.

Need help before paying? We’re here for you—Text us on whatsapp anytime!`;

        const orderData = {
            customer_id: contactId,
            salesperson_id: salespersonId || undefined,
            date: new Date().toISOString().split("T")[0], // Order Date = Creation Date
            reference_number: booking.code,
            line_items: lineItems,
            custom_fields: customFields,
            terms: TERMS_AND_CONDITIONS
        };

        const orderRes = await createSalesOrder(orderData);

        if (orderRes.code !== 0) {
            throw new Error("Failed to create Sales Order: " + orderRes.message);
        }

        const salesOrderId = orderRes.salesorder.salesorder_id;
        // Construct URL - standard US/EU data center URL structure usually, but for zoho.com it might vary.
        // Usually it's https://books.zoho.com/app/<orgId>#/salesorders/<salesOrderId>
        const orgId = await getOrganizationId();
        const salesOrderUrl = `https://books.zoho.com/app/${orgId}#/salesorders/${salesOrderId}`;

        // 3. Update Booking in Supabase
        const { error: updateError } = await serviceClient
            .from("bookings")
            .update({
                zoho_sales_order_id: salesOrderId,
                sales_order_url: salesOrderUrl
            })
            .eq("id", bookingId);

        if (updateError) {
            console.error("Failed to update booking with sales order info:", updateError);
            // We don't fail the action because the SO was created, but we log it.
        }

        revalidatePath(`/bookings/${bookingId}`); // Revalidate the specific booking page

        return { success: true, data: { salesOrderId, salesOrderUrl } };

    } catch (error: any) {
        console.error("createSalesOrderForBooking failed:", error);
        return { success: false, error: error.message || "Unknown error" };
    }
}
