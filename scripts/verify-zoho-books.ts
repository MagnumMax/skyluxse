import * as dotenv from 'dotenv';
import { getOrganizationId, createInvoice } from '../lib/zoho/books';

dotenv.config({ path: '.env.local' });

async function verifyBooks() {
    console.log("Verifying Zoho Books Integration...");

    try {
        console.log("Fetching Organization ID...");
        const orgId = await getOrganizationId();
        console.log(`Success! Organization ID: ${orgId}`);

        console.log("Creating Test Contact in Zoho Books...");
        const { createContact } = await import('../lib/zoho/books');
        const contactData = {
            contact_name: "Test Books Customer",
            company_name: "Test Company Inc.",
            contact_persons: [{
                first_name: "Test",
                last_name: "User",
                email: "test.books.user@example.com",
                phone: "1234567890",
                is_primary_contact: true
            }]
        };

        // Use the known Contact ID for testing as per user request
        const contactId = "6183693000003963001";
        console.log(`Using existing Contact ID: ${contactId}`);

        // Fetch a salesperson (user)
        console.log("Fetching Salesperson...");
        const client = await import('../lib/zoho/books').then(m => m.getBooksClient());

        let salespersonId;

        // Try getting current user
        const meRes = await client.get("/users/me", orgId);
        if (meRes.code === 0 && meRes.user) {
            salespersonId = meRes.user.user_id;
            console.log(`Using Current User as Salesperson: ${meRes.user.name} (${salespersonId})`);
        } else {
            // Fallback to listing users
            console.log("Could not fetch /users/me, trying /users...");
            const usersRes = await client.get("/users", orgId);
            if (usersRes.code === 0 && usersRes.users.length > 0) {
                const user = usersRes.users.find((u: any) => u.status === "active") || usersRes.users[0];
                salespersonId = user.user_id;
                console.log(`Using Salesperson from list: ${user.name} (${salespersonId})`);
            } else {
                console.warn("Could not fetch users. Response:", JSON.stringify(usersRes));
            }
        }

        console.log("Creating Test Sales Order...");
        const { createSalesOrder } = await import('../lib/zoho/books');
        const orderData: any = {
            customer_id: contactId,
            date: new Date().toISOString().split('T')[0],
            status: "draft",
            line_items: [
                {
                    name: "Test Product",
                    rate: 100,
                    quantity: 1
                }
            ]
        };

        if (salespersonId) {
            orderData.salesperson_id = salespersonId;
        }

        const orderResponse = await createSalesOrder(orderData);
        if (orderResponse.code === 0) {
            console.log("Success! Created Sales Order ID:", orderResponse.salesorder.salesorder_id);
        } else {
            console.error("Failed to create Sales Order:", orderResponse.message);
        }

        console.log("Zoho Books connection verified successfully.");

    } catch (error) {
        console.error("Verification Failed:", error);
    }
}

verifyBooks();
