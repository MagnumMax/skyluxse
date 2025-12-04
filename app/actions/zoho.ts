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
