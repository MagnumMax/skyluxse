import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { URL } from 'url';

dotenv.config({ path: '.env.local' });

const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
// Default to US if not specified, but try to infer from ZOHO_API_DOMAIN if possible
// ZOHO_API_DOMAIN might be "www.zohoapis.com" or "www.zohoapis.eu"
// Accounts URL depends on DC: accounts.zoho.com, accounts.zoho.eu, etc.
let ACCOUNTS_URL = "https://accounts.zoho.com";

if (process.env.ZOHO_API_DOMAIN) {
    if (process.env.ZOHO_API_DOMAIN.includes(".eu")) ACCOUNTS_URL = "https://accounts.zoho.eu";
    if (process.env.ZOHO_API_DOMAIN.includes(".in")) ACCOUNTS_URL = "https://accounts.zoho.in";
    if (process.env.ZOHO_API_DOMAIN.includes(".com.cn")) ACCOUNTS_URL = "https://accounts.zoho.com.cn";
    if (process.env.ZOHO_API_DOMAIN.includes(".com.au")) ACCOUNTS_URL = "https://accounts.zoho.com.au";
}

const REDIRECT_URI = "https://skyluxse.vercel.app/oauth-callback?provider=zoho";
const SCOPES = "ZohoCRM.modules.ALL,ZohoCRM.users.ALL,ZohoCRM.org.ALL,ZohoCRM.settings.ALL,ZohoBooks.fullaccess.all"; // Adjust scopes as needed

async function generateToken() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error("Error: ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET is missing in .env.local");
        process.exit(1);
    }

    const codeArg = process.argv[2];

    if (!codeArg) {
        console.log("--- Zoho Refresh Token Generator ---");
        console.log(`Client ID: ${CLIENT_ID}`);
        console.log(`Redirect URI: ${REDIRECT_URI}`);
        console.log(`Accounts URL: ${ACCOUNTS_URL}`);
        console.log("\n1. Visit the following URL in your browser to authorize the app:");

        const authUrl = `${ACCOUNTS_URL}/oauth/v2/auth?scope=${SCOPES}&client_id=${CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${REDIRECT_URI}`;
        console.log(`\n${authUrl}\n`);

        console.log("2. After authorization, you will be redirected to a URL like:");
        console.log(`   ${REDIRECT_URI}&code=YOUR_GRANT_TOKEN&...`);
        console.log("\n3. Run this script again with the code as an argument:");
        console.log(`   npx tsx scripts/generate-zoho-token.ts YOUR_GRANT_TOKEN`);
        return;
    }

    let code = codeArg;
    // Clean up code if user pasted full URL
    if (code.includes("code=")) {
        try {
            const urlObj = new URL(code.startsWith("http") ? code : `http://dummy.com/${code}`);
            code = urlObj.searchParams.get("code") || code;
        } catch (e) {
            // ignore
        }
    }

    console.log(`\nExchanging code for tokens...`);

    try {
        const tokenUrl = `${ACCOUNTS_URL}/oauth/v2/token`;
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('redirect_uri', REDIRECT_URI);
        params.append('code', code);

        const response = await fetch(tokenUrl, {
            method: 'POST',
            body: params
        });

        const data = await response.json();

        if (data.error) {
            console.error("\nError from Zoho:", data.error);
            console.error("Details:", JSON.stringify(data, null, 2));
        } else {
            console.log("\nSUCCESS! Here are your tokens:");
            console.log("------------------------------------------------");
            if (data.refresh_token) {
                console.log(`ZOHO_REFRESH_TOKEN=${data.refresh_token}`);
                console.log("\nCopy the line above and add it to your .env.local file.");
            } else {
                console.warn("No refresh_token returned. Did you already generate one? Refresh tokens are usually only returned on the first consent.");
                console.warn("You might need to go to https://accounts.zoho.com/developerconsole, revoke the app access, and try again to get a new refresh token.");
            }
            console.log("------------------------------------------------");
            console.log("Full response:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Network or parsing error:", error);
    }
}

generateToken();
