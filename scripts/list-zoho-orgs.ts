import * as dotenv from 'dotenv';
import { getBooksClient } from '../lib/zoho/books';

dotenv.config({ path: '.env.local' });

async function listOrgs() {
    console.log("Fetching Zoho Organizations...");
    try {
        const client = await getBooksClient();
        const data = await client.get("/organizations");

        if (data.code === 0) {
            console.log("\nAvailable Organizations:");
            data.organizations.forEach((org: any) => {
                console.log(`- Name: ${org.name}, ID: ${org.organization_id}, Is Default: ${org.is_default_org}`);
            });
            console.log("\nCheck which ID matches the one in your browser URL.");
        } else {
            console.error("Failed to fetch organizations:", data.message);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

listOrgs();
