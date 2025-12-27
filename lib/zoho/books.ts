import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient;

function getSupabase() {
    if (!supabase) {
        supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }
    return supabase;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 500): Promise<Response> {
    try {
        const res = await fetch(url, options);
        // Retry on server errors (5xx)
        if (!res.ok && res.status >= 500) {
            throw new Error(`Server error: ${res.status}`);
        }
        return res;
    } catch (err) {
        if (retries > 0) {
            console.warn(`Fetch failed, retrying (${retries} left)... Error: ${err instanceof Error ? err.message : String(err)}`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw err;
    }
}

export async function getAccessToken() {
    // 1. Try to get from DB
    // We assume the first token in the table is the one we want, or filter by user_mail if needed
    const { data } = await getSupabase().from('zoho_tokens').select('*').limit(1).maybeSingle();

    let refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    let accessToken = null;
    let expiryTime = 0;

    if (data) {
        refreshToken = data.refresh_token || refreshToken;
        accessToken = data.access_token;
        expiryTime = Number(data.expiry_time);
    } else {
        console.log("No Zoho token found in DB, falling back to env vars");
    }

    // Check if valid (give 5 min buffer)
    if (accessToken && expiryTime > Date.now() + 5 * 60 * 1000) {
        return accessToken;
    }

    console.log("Refreshing Zoho Access Token...");

    if (!refreshToken) {
        console.error("Zoho Refresh Token is missing in both DB (zoho_tokens) and Env (ZOHO_REFRESH_TOKEN)");
        throw new Error("No refresh token found");
    }

    const url = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${refreshToken}&client_id=${process.env.ZOHO_CLIENT_ID}&client_secret=${process.env.ZOHO_CLIENT_SECRET}&grant_type=refresh_token`;
    const response = await fetchWithRetry(url, { method: 'POST' });
    const tokens = await response.json();

    if (tokens.error) {
        console.error("Error refreshing token:", tokens);
        throw new Error(tokens.error);
    }

    // Update DB
    await getSupabase().from('zoho_tokens').upsert({
        id: data?.id, // Update existing row if found
        user_mail: process.env.ZOHO_USER_EMAIL || 'system',
        access_token: tokens.access_token,
        expiry_time: (Date.now() + (tokens.expires_in * 1000)).toString(),
        refresh_token: refreshToken // Keep existing
    });

    return tokens.access_token;
}

export async function getBooksClient() {
    const token = await getAccessToken();

    // We need to find the organization_id first if not known
    // But for efficiency, we can cache it or let the caller handle it.
    // For now, let's fetch it if we don't have it, or just return a client that can fetch it.

    const baseUrl = process.env.ZOHO_BOOKS_API_URL || "https://www.zohoapis.com/books/v3";

    const client = {
        get: async (path: string, orgId?: string) => {
            const url = new URL(`${baseUrl}${path}`);
            if (orgId) url.searchParams.append("organization_id", orgId);

            const res = await fetchWithRetry(url.toString(), {
                headers: { Authorization: `Zoho-oauthtoken ${token}` }
            });
            return res.json();
        },
        post: async (path: string, body: any, orgId?: string) => {
            const url = new URL(`${baseUrl}${path}`);
            if (orgId) url.searchParams.append("organization_id", orgId);

            const res = await fetchWithRetry(url.toString(), {
                method: 'POST',
                headers: {
                    Authorization: `Zoho-oauthtoken ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            return res.json();
        },
        put: async (path: string, body: any, orgId?: string) => {
            const url = new URL(`${baseUrl}${path}`);
            if (orgId) url.searchParams.append("organization_id", orgId);

            const res = await fetchWithRetry(url.toString(), {
                method: 'PUT',
                headers: {
                    Authorization: `Zoho-oauthtoken ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            return res.json();
        },
        delete: async (path: string, orgId?: string) => {
            const url = new URL(`${baseUrl}${path}`);
            if (orgId) url.searchParams.append("organization_id", orgId);

            const res = await fetchWithRetry(url.toString(), {
                method: 'DELETE',
                headers: {
                    Authorization: `Zoho-oauthtoken ${token}`
                }
            });
            return res.json();
        }
    };

    return client;
}

export async function getOrganizationId() {
    if (process.env.ZOHO_ORG_ID) {
        return process.env.ZOHO_ORG_ID;
    }

    const client = await getBooksClient();
    const data = await client.get("/organizations");
    if (data.code === 0 && data.organizations.length > 0) {
        return data.organizations[0].organization_id;
    }
    throw new Error("No organizations found in Zoho Books.");
}

export async function createInvoice(invoiceData: any) {
    const orgId = await getOrganizationId();
    const client = await getBooksClient();
    return client.post("/invoices", invoiceData, orgId);
}

export async function createContact(contactData: any, customFields?: any[]) {
    const orgId = await getOrganizationId();
    const client = await getBooksClient();
    const payload = { ...contactData };
    if (customFields && customFields.length > 0) {
        payload.custom_fields = customFields;
    }
    return client.post("/contacts", payload, orgId);
}

export async function updateContact(contactId: string, contactData: any, customFields?: any[]) {
    const orgId = await getOrganizationId();
    const client = await getBooksClient();
    const payload = { ...contactData };
    if (customFields && customFields.length > 0) {
        payload.custom_fields = customFields;
    }
    return client.put(`/contacts/${contactId}`, payload, orgId);
}

export async function createSalesOrder(orderData: any) {
    const orgId = await getOrganizationId();
    const client = await getBooksClient();
    return client.post("/salesorders", orderData, orgId);
}

export async function updateSalesOrder(salesOrderId: string, orderData: any) {
    const orgId = await getOrganizationId();
    const client = await getBooksClient();
    return client.put(`/salesorders/${salesOrderId}`, orderData, orgId);
}

export async function deleteSalesOrder(salesOrderId: string) {
    const orgId = await getOrganizationId();
    const client = await getBooksClient();
    return client.delete(`/salesorders/${salesOrderId}`, orgId);
}

export async function getSalesOrders(params: { customer_name?: string, email?: string } = {}) {
    const orgId = await getOrganizationId();
    const client = await getBooksClient();
    const searchParams = new URLSearchParams();
    if (params.customer_name) searchParams.append('customer_name', params.customer_name);
    if (params.email) searchParams.append('email', params.email);
    
    return client.get(`/salesorders?${searchParams.toString()}`, orgId);
}

export async function findContactByEmail(email: string) {
    const orgId = await getOrganizationId();
    const client = await getBooksClient();
    // Filter by contact_type to ensure we get a customer, not a vendor.
    // The Zoho API supports filtering by 'contact_name', 'email', 'company_name', etc.
    // It also supports 'contact_type' which can be 'customer' or 'vendor'.
    const response = await client.get(`/contacts?email=${encodeURIComponent(email)}&contact_type=customer`, orgId);

    if (response.code === 0 && response.contacts.length > 0) {
        return response.contacts[0];
    }
    return null;
}
