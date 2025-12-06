// @ts-ignore
import * as ZOHOCRMSDK from "@zohocrm/nodejs-sdk-7.0/lib/zohocrmsdk.js";
import { initializeZoho } from "./config";

export async function createZohoClient(clientData: {
    FirstName: string;
    LastName: string;
    Email: string;
    Phone?: string;
}) {
    await initializeZoho();

    const record = new ZOHOCRMSDK.Record.Record();
    record.addFieldValue(ZOHOCRMSDK.Record.Field.Contacts.FIRST_NAME, clientData.FirstName);
    record.addFieldValue(ZOHOCRMSDK.Record.Field.Contacts.LAST_NAME, clientData.LastName);
    record.addFieldValue(ZOHOCRMSDK.Record.Field.Contacts.EMAIL, clientData.Email);
    if (clientData.Phone) {
        record.addFieldValue(ZOHOCRMSDK.Record.Field.Contacts.PHONE, clientData.Phone);
    }

    const request = new ZOHOCRMSDK.Record.RecordOperations("Contacts");
    const bodyWrapper = new ZOHOCRMSDK.Record.BodyWrapper();
    bodyWrapper.setData([record]);

    const response = await request.createRecords(bodyWrapper);
    return response;
}

export async function createZohoOrder(orderData: {
    Subject: string;
    ContactId: string; // Zoho Contact ID
    ProductDetails: { ProductId: string; Quantity: number; UnitPrice: number }[];
}) {
    await initializeZoho();

    const record = new ZOHOCRMSDK.Record.Record();
    record.addFieldValue(ZOHOCRMSDK.Record.Field.Sales_Orders.SUBJECT, orderData.Subject);

    // Link to Contact
    const contact = new ZOHOCRMSDK.Record.Record();
    contact.setId(orderData.ContactId);
    record.addFieldValue(ZOHOCRMSDK.Record.Field.Sales_Orders.CONTACT_NAME, contact);

    // Add Line Items (simplified)
    // Note: This requires Products to exist in Zoho and their IDs known
    // For now, we might just create a basic order or need to look up products first

    const request = new ZOHOCRMSDK.Record.RecordOperations("Sales_Orders");
    const bodyWrapper = new ZOHOCRMSDK.Record.BodyWrapper();
    bodyWrapper.setData([record]);

    const response = await request.createRecords(bodyWrapper);
    return response;
}
