import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClientAction, createOrderAction } from "../app/actions/zoho";

async function verifyZohoIntegration() {
    console.log("Starting verification...");

    // 1. Test Client Creation
    console.log("Testing Client Creation...");
    const clientResult = await createClientAction({
        firstName: "Test",
        lastName: "User",
        email: "test.user@example.com",
        phone: "1234567890"
    });
    console.log("Client Creation Result:", JSON.stringify(clientResult, null, 2));

    if (clientResult.success && clientResult.data) {
        // Extract Contact ID from response (adjust based on actual response structure)
        // Assuming response.data.data[0].details.id or similar
        // For now, we'll just log it. In a real test, we'd parse it.
        // const contactId = "some_contact_id"; // Placeholder

        // 2. Test Order Creation
        // console.log("Testing Order Creation...");
        // const orderResult = await createOrderAction({
        //     subject: "Test Order",
        //     contactId: contactId,
        //     products: [
        //         { productId: "some_product_id", quantity: 1, unitPrice: 100 }
        //     ]
        // });
        // console.log("Order Creation Result:", JSON.stringify(orderResult, null, 2));
    } else {
        console.error("Skipping Order Creation due to Client Creation failure.");
    }
}

verifyZohoIntegration().catch(console.error);
