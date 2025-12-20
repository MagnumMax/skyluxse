"use server";

import { createZohoClient, createZohoOrder } from "@/lib/zoho/client";
import { buildZohoSalesOrderCustomFields, resolveZohoSalespersonId } from "@/lib/zoho/sales-order-payload";

export type CreateSalesOrderResult =
    | { success: true; data: { salesOrderId: string; salesOrderUrl: string; message?: string } }
    | { success: false; error: string }

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

export async function createSalesOrderForBooking(bookingId: string): Promise<CreateSalesOrderResult> {
    let booking: any = null;
    let client: any = null;

    try {
        const { getLiveBookingById, getLiveClientById } = await import("@/lib/data/live-data");
        const { createSalesOrder, findContactByEmail, createContact, getOrganizationId } = await import("@/lib/zoho/books");
        const { serviceClient } = await import("@/lib/supabase/service-client");
        const { revalidatePath } = await import("next/cache");
        const { updateKommoLeadStatus } = await import("@/lib/kommo/client");
        const { KOMMO_STATUSES_FOR_SALES_ORDER } = await import("@/lib/constants/bookings");
        const { sendNotification } = await import("@/lib/notifications");

        booking = await getLiveBookingById(bookingId);
        if (!booking) throw new Error("Booking not found");

        // Check if sales order already exists
        if (booking.zohoSalesOrderId) {
            const orgId = await getOrganizationId();
            const existingSalesOrderUrl = `https://books.zoho.com/app/${orgId}#/salesorders/${booking.zohoSalesOrderId}`;
            return {
                success: true,
                data: {
                    salesOrderId: booking.zohoSalesOrderId,
                    salesOrderUrl: booking.salesOrderUrl || existingSalesOrderUrl,
                    message: "Sales Order already exists",
                },
            };
        }

        // Check sync status to prevent race conditions
        const { data: syncStatus } = await serviceClient
            .from("bookings")
            .select("zoho_sync_status")
            .eq("id", bookingId)
            .single();

        if (syncStatus?.zoho_sync_status === "in_progress" || syncStatus?.zoho_sync_status === "synced") {
            return {
                success: true,
                data: {
                    salesOrderId: booking.zohoSalesOrderId || "",
                    salesOrderUrl: booking.salesOrderUrl || "",
                    message: "Sales Order creation is already in progress or completed",
                },
            };
        }

        // Acquire lock
        await serviceClient
            .from("bookings")
            .update({ zoho_sync_status: "in_progress" })
            .eq("id", bookingId);

        client = booking.clientId ? await getLiveClientById(String(booking.clientId)) : null;
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

        const salespersonId = resolveZohoSalespersonId(booking.ownerName);

        // 1. Fetch Vehicle Zoho Item ID
        const { data: vehicleData } = await serviceClient
            .from("vehicles")
            .select("zoho_item_id")
            .eq("id", booking.carId)
            .single();

        const zohoItemId = vehicleData?.zoho_item_id;

        // Fetch additional services from booking
        const { data: bookingServices } = await serviceClient
            .from("booking_additional_services")
            .select(`
                price,
                description,
                quantity,
                service:additional_services (
                    name
                )
            `)
            .eq("booking_id", bookingId);

        // Fetch tasks and their additional services
        const { data: taskServices } = await serviceClient
            .from("tasks")
            .select(`
                id,
                title,
                services:task_additional_services (
                    price,
                    description,
                    quantity,
                    service:additional_services (
                        name
                    )
                )
            `)
            .eq("booking_id", bookingId);

        const { differenceInDays, parseISO } = await import("date-fns");
        const { formatZohoDateTime, formatZohoDate } = await import("@/lib/formatters");

        let quantity = 1;
        let startStr = "";
        let endStr = "";

        if (booking.startDate && booking.endDate) {
            const start = parseISO(booking.startDate);
            const end = parseISO(booking.endDate);
            const days = differenceInDays(end, start);
            if (days > 0) quantity = days;

            startStr = formatZohoDateTime(booking.startDate);
            endStr = formatZohoDateTime(booking.endDate);
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

        // Add additional services from booking
        if (bookingServices && bookingServices.length > 0) {
            bookingServices.forEach((as: any) => {
                lineItems.push({
                    item_id: undefined, // We don't have item_id for dynamic services yet
                    name: as.service?.name || "Additional Service",
                    description: as.description || "",
                    rate: as.price,
                    quantity: as.quantity || 1,
                    tax_id: "6183693000000229181"
                });
            });
        }

        // Add additional services from tasks
        if (taskServices && taskServices.length > 0) {
            taskServices.forEach((task: any) => {
                if (task.services && task.services.length > 0) {
                    task.services.forEach((as: any) => {
                        lineItems.push({
                            item_id: undefined,
                            name: `${as.service?.name || "Task Service"} (Task: ${task.title})`,
                            description: as.description || "",
                            rate: as.price,
                            quantity: as.quantity || 1,
                            tax_id: "6183693000000229181"
                        });
                    });
                }
            });
        }

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

        const customFields = buildZohoSalesOrderCustomFields(booking);

        const TERMS_AND_CONDITIONS = `Thank you for choosing us! To secure your booking, please complete the advance payment using the secure link below.

Cancellation Policy:
Free cancellation 7 days before pickup → Full refund.
Non-refundable if cancelled 7 days before pickup.

By proceeding, you agree to these terms and authorize us to hold the vehicle just for you.

Need help before paying? We’re here for you—Text us on whatsapp anytime!`;

        const orderData = {
            customer_id: contactId,
            salesperson_id: salespersonId,
            date: formatZohoDate(new Date()), // Order Date = Creation Date
            reference_number: booking.code,
            line_items: lineItems,
            custom_fields: customFields,
            status: "draft",
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

        // 4. Update Kommo Status
        try {
            const { data: bookingRaw } = await serviceClient
                .from("bookings")
                .select("source_payload_id, advance_payment")
                .eq("id", bookingId)
                .single();

            if (bookingRaw?.source_payload_id?.startsWith("kommo:")) {
                const leadId = bookingRaw.source_payload_id.replace("kommo:", "");
                const advancePayment = Number(bookingRaw.advance_payment || 0);
                
                // Logic: if advance_payment > 0 -> Payment Pending (96150292), else Confirmed (75440391)
                const targetStatusId = advancePayment > 0 ? "96150292" : "75440391";
                
                console.log(`Updating Kommo Lead ${leadId} to status ${targetStatusId} (Advance: ${advancePayment})`);
                await updateKommoLeadStatus(leadId, targetStatusId);
            }
        } catch (kommoError) {
            console.error("Failed to update Kommo status:", kommoError);
            // Don't fail the action if Kommo update fails
        }

        revalidatePath(`/bookings/${bookingId}`); // Revalidate the specific booking page

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

        // 5. Send Notification (Success)
        await sendNotification('telegram', {
            message: `✅ <b>Sales Order Created</b>\n\n<b>Booking:</b> ${booking.code}\n<b>Sales Order:</b> <a href="${salesOrderUrl}">Link</a>\n<b>Client:</b> ${client.name}\n<b>Auto:</b> ${booking.carName}\n<b>Plate:</b> ${booking.carPlate || "N/A"}\n<b>Amount:</b> ${booking.totalAmount} AED${servicesText}`
        }).catch(err => console.error("Failed to send success notification", err));

        return { success: true, data: { salesOrderId, salesOrderUrl } };

    } catch (error: any) {
        console.error("createSalesOrderForBooking failed:", error);
        
        // 6. Send Notification (Failure)
        const { sendNotification } = await import("@/lib/notifications");
        await sendNotification('telegram', {
            message: `❌ <b>Sales Order Creation Failed</b>\n\n<b>Booking:</b> ${booking?.code || bookingId}\n<b>Client:</b> ${client?.name || "N/A"}\n<b>Auto:</b> ${booking?.carName || "N/A"}\n<b>Plate:</b> ${booking?.carPlate || "N/A"}\n<b>Error:</b> ${error.message || "Unknown error"}`
        }).catch(err => console.error("Failed to send failure notification", err));

        return { success: false, error: error.message || "Unknown error" };
    }
}

export async function updateSalesOrderForBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { getLiveBookingById } = await import("@/lib/data/live-data");
        const { updateSalesOrder, getOrganizationId } = await import("@/lib/zoho/books");
        const { serviceClient } = await import("@/lib/supabase/service-client");
        const { revalidatePath } = await import("next/cache");
        const { sendNotification } = await import("@/lib/notifications");

        const booking = await getLiveBookingById(bookingId);
        if (!booking) throw new Error("Booking not found");

        if (!booking.zohoSalesOrderId) {
            console.log("No Sales Order ID found for booking, skipping update.");
            return { success: false, error: "No Sales Order ID found" };
        }

        // 1. Fetch Vehicle Zoho Item ID
        const { data: vehicleData } = await serviceClient
            .from("vehicles")
            .select("zoho_item_id")
            .eq("id", booking.carId)
            .single();

        const zohoItemId = vehicleData?.zoho_item_id;

        // Fetch additional services from booking
        const { data: bookingServices } = await serviceClient
            .from("booking_additional_services")
            .select(`
                price,
                description,
                quantity,
                service:additional_services (
                    name
                )
            `)
            .eq("booking_id", bookingId);

        // Fetch tasks and their additional services
        const { data: taskServices } = await serviceClient
            .from("tasks")
            .select(`
                id,
                title,
                services:task_additional_services (
                    price,
                    description,
                    quantity,
                    service:additional_services (
                        name
                    )
                )
            `)
            .eq("booking_id", bookingId);

        const { differenceInDays, parseISO } = await import("date-fns");
        const { formatZohoDateTime, formatZohoDate } = await import("@/lib/formatters");

        let quantity = 1;
        let startStr = "";
        let endStr = "";

        if (booking.startDate && booking.endDate) {
            const start = parseISO(booking.startDate);
            const end = parseISO(booking.endDate);
            const days = differenceInDays(end, start);
            if (days > 0) quantity = days;

            startStr = formatZohoDateTime(booking.startDate);
            endStr = formatZohoDateTime(booking.endDate);
        }

        const rate = booking.priceDaily || (booking.totalAmount ? booking.totalAmount / quantity : 0);

        const lineItems = [
            {
                item_id: zohoItemId || undefined,
                ...(zohoItemId ? {} : { name: `Car Rental - ${booking.carName}` }),
                description: `${startStr} - ${endStr}`,
                rate: rate,
                quantity: quantity,
                tax_id: "6183693000000229181"
            }
        ];

        // Add additional services from booking
        if (bookingServices && bookingServices.length > 0) {
            bookingServices.forEach((as: any) => {
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

        // Add additional services from tasks
        if (taskServices && taskServices.length > 0) {
            taskServices.forEach((task: any) => {
                if (task.services && task.services.length > 0) {
                    task.services.forEach((as: any) => {
                        lineItems.push({
                            item_id: undefined,
                            name: `${as.service?.name || "Task Service"} (Task: ${task.title})`,
                            description: as.description || "",
                            rate: as.price,
                            quantity: as.quantity || 1,
                            tax_id: "6183693000000229181"
                        });
                    });
                }
            });
        }

        // Helper to extract fee amount from label
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
        if (booking.insuranceFeeLabel && booking.insuranceFeeLabel.toLowerCase().includes("no deposit")) {
            const noDepositFee = extractFee(booking.insuranceFeeLabel);
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

        const customFields = buildZohoSalesOrderCustomFields(booking);

        const updateData = {
            line_items: lineItems,
            custom_fields: customFields
        };

        const response = await updateSalesOrder(booking.zohoSalesOrderId, updateData);

        if (response.code === 0) {
            const orgId = await getOrganizationId();
            const salesOrderUrl = `https://books.zoho.com/app/${orgId}#/salesorders/${booking.zohoSalesOrderId}`;
            
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
                message: `🔄 <b>Sales Order Updated</b>\n\n<b>Booking:</b> ${booking.code}\n<b>Sales Order:</b> <a href="${salesOrderUrl}">Link</a>\n<b>Client:</b> ${booking.clientName}\n<b>Auto:</b> ${booking.carName}\n<b>Plate:</b> ${booking.carPlate || "N/A"}${servicesText}`
            }).catch(err => console.error("Failed to send update notification", err));

            revalidatePath(`/bookings/${bookingId}`);
            return { success: true };
        } else {
            throw new Error(response.message);
        }

    } catch (error: any) {
        console.error("Failed to update Sales Order:", error);
        return { success: false, error: error.message };
    }
}
