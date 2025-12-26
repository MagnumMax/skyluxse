"use server";

import { createZohoClient, createZohoOrder } from "@/lib/zoho/client";
import { buildZohoSalesOrderCustomFields, resolveZohoSalespersonId } from "@/lib/zoho/sales-order-payload";
import { ZOHO_ITEM_IDS, ZOHO_TAX_IDS, ZOHO_TERMS_AND_CONDITIONS } from "@/lib/constants/zoho";
import { differenceInDays, parseISO } from "date-fns";
import { formatZohoDateTime, formatZohoDate } from "@/lib/formatters";
import { resolveFee } from "@/lib/pricing/booking-totals";
import { 
    KOMMO_DELIVERY_FEE_MAP, 
    KOMMO_INSURANCE_FEE_MAP, 
    KOMMO_REFUNDABLE_DEPOSIT_IDS
} from "@/lib/integrations/kommo/fee-mapping";

export type CreateSalesOrderResult =
    | { success: true; data: { salesOrderId: string; salesOrderUrl: string; message?: string } }
    | { success: false; error: string }

// --- Shared Helpers ---

async function fetchBookingFullData(bookingId: string) {
    const { getLiveBookingById, getLiveClientById } = await import("@/lib/data/live-data");
    const { serviceClient } = await import("@/lib/supabase/service-client");

    const booking = await getLiveBookingById(bookingId);
    if (!booking) throw new Error("Booking not found");

    const client = booking.clientId ? await getLiveClientById(String(booking.clientId)) : null;
    
    // Fetch Vehicle Zoho Item ID
    const { data: vehicleData } = await serviceClient
        .from("vehicles")
        .select("zoho_item_id")
        .eq("id", booking.carId)
        .single();

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

    return { booking, client, vehicleData, bookingServices, taskServices };
}

function buildLineItems(booking: any, zohoItemId: string | undefined, bookingServices: any[], taskServices: any[]) {
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
            tax_id: ZOHO_TAX_IDS.STANDARD_RATE_5_PERCENT
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
                tax_id: ZOHO_TAX_IDS.STANDARD_RATE_5_PERCENT
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
                        tax_id: ZOHO_TAX_IDS.STANDARD_RATE_5_PERCENT
                    });
                });
            }
        });
    }

    // Delivery Fee
    const deliveryFee = resolveFee(booking.deliveryFeeLabel, KOMMO_DELIVERY_FEE_MAP);
    
    if (deliveryFee > 0) {
        lineItems.push({
            item_id: ZOHO_ITEM_IDS.DELIVERY_CHARGE,
            name: "Delivery Charge", 
            description: "",
            rate: deliveryFee,
            quantity: 1,
            tax_id: ZOHO_TAX_IDS.STANDARD_RATE_5_PERCENT
        });
    }

    // Insurance / Security Deposit Logic
    const insuranceLabel = booking.insuranceFeeLabel;
    const insuranceAmount = resolveFee(insuranceLabel, KOMMO_INSURANCE_FEE_MAP);

    if (insuranceAmount > 0) {
        // Check if it's a refundable deposit
        const isRefundable = (insuranceLabel && KOMMO_REFUNDABLE_DEPOSIT_IDS.has(insuranceLabel)) || 
                            (insuranceLabel?.toLowerCase().includes("security deposit"));

        if (!isRefundable) {
            // Non-Refundable Fee (e.g. No Deposit Fee) - TAXABLE (5%)
            const isNoDeposit = insuranceLabel?.toLowerCase().includes("no deposit");
            const itemId = isNoDeposit ? ZOHO_ITEM_IDS.NO_DEPOSIT_FEE : undefined;
            
            lineItems.push({
                item_id: itemId,
                name: isNoDeposit ? "No Deposit Fixed Fee" : "Insurance Fee",
                description: "",
                rate: insuranceAmount,
                quantity: 1,
                tax_id: ZOHO_TAX_IDS.STANDARD_RATE_5_PERCENT
            });
        }
    }

    // CDW Insurance (Full Insurance Fee)
    if (booking.fullInsuranceFee && booking.fullInsuranceFee > 0) {
        lineItems.push({
            item_id: ZOHO_ITEM_IDS.CDW_INSURANCE,
            name: "CDW Insurance",
            description: "",
            rate: booking.fullInsuranceFee,
            quantity: 1,
            tax_id: ZOHO_TAX_IDS.STANDARD_RATE_5_PERCENT
        });
    }

    return lineItems;
}

async function findOrCreateZohoContact(client: any, books: any) {
    const { findContactByEmail, createContact } = books;
    
    const existingContact = await findContactByEmail(client.email);
    if (existingContact) {
        return existingContact.contact_id;
    }

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
    
    const customFields = mapClientToZohoCustomFields(client);
    const newContactRes = await createContact(contactData, customFields);
    
    if (newContactRes.code === 0) {
        return newContactRes.contact.contact_id;
    } else {
        throw new Error("Failed to create Zoho Contact: " + newContactRes.message);
    }
}

async function updateKommoStatus(booking: any, salesOrderUrl: string) {
    try {
        const { serviceClient } = await import("@/lib/supabase/service-client");
        const { updateKommoLead } = await import("@/lib/kommo/client");

        const { data: bookingRaw } = await serviceClient
            .from("bookings")
            .select("source_payload_id, advance_payment, external_code")
            .eq("id", booking.id)
            .single();

        if (bookingRaw?.source_payload_id?.startsWith("kommo:")) {
            const leadId = bookingRaw.source_payload_id.replace("kommo:", "");
            const advancePayment = Number(bookingRaw.advance_payment || 0);
            
            // Logic: if advance_payment > 0 -> Payment Pending (96150292), else Confirmed (75440391)
            const targetStatusId = advancePayment > 0 ? "96150292" : "75440391";
            
            const kommoPayload = {
                status_id: Number(targetStatusId),
                custom_fields_values: [
                    {
                        field_id: 1224030, // Sales order URL
                        values: [{ value: salesOrderUrl }]
                    },
                    {
                        field_id: 1234159, // erp_deal_id
                        values: [{ value: bookingRaw.external_code || booking.code }]
                    }
                ]
            };

            console.log(`Updating Kommo Lead ${leadId} with status ${targetStatusId} and SO details`);
            await updateKommoLead(leadId, kommoPayload);
        }
    } catch (kommoError) {
        console.error("Failed to update Kommo status:", kommoError);
        // Don't fail the action if Kommo update fails
    }
}

// --- Main Actions ---

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

function mapClientToZohoCustomFields(client: any): any[] {
    const fields: any[] = [];
    
    // Helper to format date to YYYY-MM-DD
    const formatDate = (date: string | undefined | null) => {
        if (!date) return undefined;
        // Handle ISO string or simple date string
        return date.split('T')[0];
    };

    // 1. Try to extract from doc_raw (if array)
    let passportData = null;
    let licenseData = null;
    let nationality = client.nationality;
    let dob = client.dateOfBirth;

    const rawDocs = client.documentRecognition?.raw;
    if (Array.isArray(rawDocs)) {
        passportData = rawDocs.find((d: any) => d.doc_type?.toLowerCase().includes('passport'));
        licenseData = rawDocs.find((d: any) => d.doc_type?.toLowerCase().includes('license') || d.doc_type?.toLowerCase().includes('dl'));
        
        // Try to get nationality/dob from passport first, then license
        if (passportData) {
            if (!nationality && passportData.nationality) nationality = passportData.nationality;
            if (!dob && passportData.date_of_birth) dob = passportData.date_of_birth;
        }
         if (licenseData) {
            if (!nationality && licenseData.nationality) nationality = licenseData.nationality;
             if (!dob && licenseData.date_of_birth) dob = licenseData.date_of_birth;
        }
    }

    // 2. Add Nationality & DOB
    if (nationality) fields.push({ label: "Nationality", value: nationality });
    if (dob) fields.push({ label: "Date of Birth", value: formatDate(dob) });

    const docType = client.documentRecognition?.docType?.toLowerCase() || "";
    // Check if docType suggests a license
    const isLicense = docType.includes("license") || docType.includes("dl");

    // 3. Add Passport Fields
    if (passportData) {
        if (passportData.document_number) fields.push({ label: "Passport Number", value: passportData.document_number });
        if (passportData.issue_date) fields.push({ label: "Passport Issue Date", value: formatDate(passportData.issue_date) });
        if (passportData.expiry_date) fields.push({ label: "Passport Expiry Date", value: formatDate(passportData.expiry_date) });
    } else if (!isLicense && client.documentNumber) {
        // Fallback: If not explicitly a license, we map generic document fields to Passport
        fields.push({ label: "Passport Number", value: client.documentNumber });
        if (client.issueDate) fields.push({ label: "Passport Issue Date", value: formatDate(client.issueDate) });
        if (client.expiryDate) fields.push({ label: "Passport Expiry Date", value: formatDate(client.expiryDate) });
    }
    
    // 4. Add Driving License Fields
    if (licenseData) {
        if (licenseData.document_number) fields.push({ label: "Driving License Number", value: licenseData.document_number });
        if (licenseData.issue_date) fields.push({ label: "Driving License Issue Date", value: formatDate(licenseData.issue_date) });
        if (licenseData.expiry_date) fields.push({ label: "Driving License Expiry Date", value: formatDate(licenseData.expiry_date) });
    } else if (isLicense && client.documentNumber) {
        // Fallback
        fields.push({ label: "Driving License Number", value: client.documentNumber });
        if (client.issueDate) fields.push({ label: "Driving License Issue Date", value: formatDate(client.issueDate) });
        if (client.expiryDate) fields.push({ label: "Driving License Expiry Date", value: formatDate(client.expiryDate) });
    }

    return fields;
}

import { logSystemEvent } from "@/lib/system-log";

export async function createSalesOrderForBooking(bookingId: string): Promise<CreateSalesOrderResult> {
    let booking: any = null;
    let client: any = null;

    try {
        const books = await import("@/lib/zoho/books");
        const { getOrganizationId, createSalesOrder } = books;
        const { serviceClient } = await import("@/lib/supabase/service-client");
        const { revalidatePath } = await import("next/cache");
        const { sendNotification } = await import("@/lib/notifications");

        await logSystemEvent({
            level: "info",
            category: "zoho",
            message: "Starting Sales Order creation process",
            entityId: bookingId,
            entityType: "booking"
        });

        // 1. Fetch all required data
        const fullData = await fetchBookingFullData(bookingId);
        booking = fullData.booking;
        client = fullData.client;
        const { vehicleData, bookingServices, taskServices } = fullData;

        // Check sync status
        const { data: currentBooking } = await serviceClient
            .from("bookings")
            .select("id, zoho_sync_status, zoho_sales_order_id, sales_order_url")
            .eq("id", bookingId)
            .single();

        if (!currentBooking) throw new Error("Booking not found in DB");

        // Existing Order Check
        if (booking.zohoSalesOrderId) {
            const orgId = await getOrganizationId();
            const existingSalesOrderUrl = `https://books.zoho.com/app/${orgId}#/salesorders/${booking.zohoSalesOrderId}`;
            
            if (currentBooking.zoho_sync_status === 'synced') {
                // Ensure Kommo status is correct even if we skip creation
                await updateKommoStatus(booking, booking.salesOrderUrl || existingSalesOrderUrl);

                return {
                    success: true,
                    data: {
                        salesOrderId: booking.zohoSalesOrderId,
                        salesOrderUrl: booking.salesOrderUrl || existingSalesOrderUrl,
                        message: "Sales Order already exists",
                    },
                };
            }
        } else {
            // Lock Check & Acquire Atomically
            // We use .is("zoho_sync_status", null) to ensure we only lock if it's not already in progress or synced.
            // This prevents race conditions where two webhooks arrive simultaneously.
            const { data: lockedBooking, error: lockError } = await serviceClient
                .from("bookings")
                .update({ zoho_sync_status: "in_progress" })
                .eq("id", bookingId)
                .in("zoho_sync_status", ["pending", "failed"])
                .select("id")
                .maybeSingle();
            
            if (lockError) throw new Error("Failed to acquire lock: " + lockError.message);

            if (!lockedBooking) {
                // Could not acquire lock. It implies it's either in_progress or synced.
                // Fetch fresh status to return the correct message.
                const { data: freshStatus } = await serviceClient
                    .from("bookings")
                    .select("zoho_sync_status, zoho_sales_order_id, sales_order_url")
                    .eq("id", bookingId)
                    .single();

                if (freshStatus?.zoho_sync_status === 'synced' || freshStatus?.zoho_sales_order_id) {
                     await logSystemEvent({
                        level: "info",
                        category: "zoho",
                        message: "Sales Order creation skipped (already exists)",
                        entityId: bookingId,
                        entityType: "booking",
                        metadata: { salesOrderId: freshStatus.zoho_sales_order_id }
                    });

                     // Ensure Kommo status is updated
                     let finalUrl = freshStatus.sales_order_url;
                     if (!finalUrl && freshStatus.zoho_sales_order_id) {
                        const orgId = await getOrganizationId();
                        finalUrl = `https://books.zoho.com/app/${orgId}#/salesorders/${freshStatus.zoho_sales_order_id}`;
                     }
                     await updateKommoStatus(booking, finalUrl || "");

                     return {
                        success: true,
                        data: {
                            salesOrderId: freshStatus.zoho_sales_order_id,
                            salesOrderUrl: finalUrl || "",
                            message: "Sales Order already exists",
                        },
                    };
                }

                await logSystemEvent({
                    level: "warning",
                    category: "zoho",
                    message: "Sales Order creation skipped (lock active)",
                    entityId: bookingId,
                    entityType: "booking"
                });

                return {
                    success: true,
                    data: {
                        salesOrderId: freshStatus?.zoho_sales_order_id || "",
                        salesOrderUrl: freshStatus?.sales_order_url || "",
                        message: "Sales Order creation is already in progress",
                    },
                };
            }
        }

        if (!client) throw new Error("Client not found for this booking");
        if (!client.email) throw new Error("Client email is missing");

        let salesOrderId = booking.zohoSalesOrderId;
        let salesOrderUrl = booking.salesOrderUrl;

        // 2. Create Order if needed
        if (!salesOrderId) {
            // Find or Create Contact
            const contactId = await findOrCreateZohoContact(client, books);
            const salespersonId = resolveZohoSalespersonId(booking.ownerName);
            const zohoItemId = vehicleData?.zoho_item_id;

            // Build Line Items
            const lineItems = buildLineItems(booking, zohoItemId, bookingServices || [], taskServices || []);
            const customFields = buildZohoSalesOrderCustomFields(booking);

            const orderData = {
                customer_id: contactId,
                salesperson_id: salespersonId,
                date: formatZohoDate(new Date()),
                reference_number: booking.code,
                line_items: lineItems,
                custom_fields: customFields,
                status: "draft",
                terms: ZOHO_TERMS_AND_CONDITIONS
            };

            const orderRes = await createSalesOrder(orderData);

            if (orderRes.code !== 0) {
                throw new Error("Failed to create Sales Order: " + orderRes.message);
            }

            salesOrderId = orderRes.salesorder.salesorder_id;
            const orgId = await getOrganizationId();
            salesOrderUrl = `https://books.zoho.com/app/${orgId}#/salesorders/${salesOrderId}`;
        } else {
            const orgId = await getOrganizationId();
            salesOrderUrl = booking.salesOrderUrl || `https://books.zoho.com/app/${orgId}#/salesorders/${salesOrderId}`;
        }

        // 3. Update Supabase
        const { error: updateError } = await serviceClient
            .from("bookings")
            .update({
                zoho_sales_order_id: salesOrderId,
                sales_order_url: salesOrderUrl,
                zoho_sync_status: "synced"
            })
            .eq("id", bookingId);

        if (updateError) console.error("Failed to update booking with sales order info:", updateError);

        // 4. Update Kommo
        await updateKommoStatus(booking, salesOrderUrl);

        // 5. Notifications
        revalidatePath(`/bookings/${bookingId}`);

        // Prepare service names for notification
        const serviceNames: string[] = [];
        bookingServices?.forEach((as: any) => as.service?.name && serviceNames.push(as.service.name));
        taskServices?.forEach((task: any) => task.services?.forEach((as: any) => as.service?.name && serviceNames.push(`${as.service.name} (Task)`)));
        
        const servicesText = serviceNames.length > 0 ? `\n<b>Services:</b> ${serviceNames.join(", ")}` : "";

        await sendNotification('telegram', {
            message: `✅ <b>Sales Order Created</b>\n\n<b>Booking:</b> ${booking.code}\n<b>Sales Order:</b> <a href="${salesOrderUrl}">Link</a>\n<b>Client:</b> ${client.name}\n<b>Auto:</b> ${booking.carName}\n<b>Plate:</b> ${booking.carPlate || "N/A"}\n<b>Amount:</b> ${booking.totalAmount} AED${servicesText}`
        }).catch(err => console.error("Failed to send success notification", err));

        await logSystemEvent({
            level: "info",
            category: "zoho",
            message: "Sales Order created successfully",
            entityId: bookingId,
            entityType: "booking",
            metadata: { salesOrderId, salesOrderUrl }
        });

        return {
            success: true,
            data: {
                salesOrderId,
                salesOrderUrl,
                message: "Sales Order created successfully",
            },
        };

    } catch (error: any) {
        console.error("createSalesOrderForBooking failed:", error);
        
        // Release Lock on Error
        const { serviceClient } = await import("@/lib/supabase/service-client");
        await serviceClient
            .from("bookings")
            .update({ zoho_sync_status: null })
            .eq("id", bookingId);

        await logSystemEvent({
            level: "error",
            category: "zoho",
            message: "Sales Order creation failed",
            entityId: bookingId,
            entityType: "booking",
            metadata: { error: error.message || String(error) }
        });
        
        const { sendNotification } = await import("@/lib/notifications");
        await sendNotification('telegram', {
            message: `❌ <b>Sales Order Creation Failed</b>\n\n<b>Booking:</b> ${booking?.code || bookingId}\n<b>Client:</b> ${client?.name || "N/A"}\n<b>Auto:</b> ${booking?.carName || "N/A"}\n<b>Plate:</b> ${booking?.carPlate || "N/A"}\n<b>Error:</b> ${error.message || "Unknown error"}`
        }).catch(err => console.error("Failed to send failure notification", err));

        return { success: false, error: error.message || "Unknown error" };
    }
}

export async function updateSalesOrderForBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { updateSalesOrder, getOrganizationId } = await import("@/lib/zoho/books");
        const { revalidatePath } = await import("next/cache");
        const { sendNotification } = await import("@/lib/notifications");

        // 1. Fetch data
        const { booking, vehicleData, bookingServices, taskServices } = await fetchBookingFullData(bookingId);

        if (!booking.zohoSalesOrderId) {
            console.log("No Sales Order ID found for booking, skipping update.");
            return { success: false, error: "No Sales Order ID found" };
        }

        // 2. Build Line Items (using shared logic)
        const zohoItemId = vehicleData?.zoho_item_id;
        const lineItems = buildLineItems(booking, zohoItemId, bookingServices || [], taskServices || []);
        const customFields = buildZohoSalesOrderCustomFields(booking);

        // 3. Update Zoho
        const updateData = {
            line_items: lineItems,
            custom_fields: customFields
        };

        const response = await updateSalesOrder(booking.zohoSalesOrderId, updateData);

        if (response.code === 0) {
            const orgId = await getOrganizationId();
            const salesOrderUrl = `https://books.zoho.com/app/${orgId}#/salesorders/${booking.zohoSalesOrderId}`;
            
            // Notification
            const serviceNames: string[] = [];
            bookingServices?.forEach((as: any) => as.service?.name && serviceNames.push(as.service.name));
            taskServices?.forEach((task: any) => task.services?.forEach((as: any) => as.service?.name && serviceNames.push(`${as.service.name} (Task)`)));
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
