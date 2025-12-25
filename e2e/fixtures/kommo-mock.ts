import http from 'http';

export interface KommoMockServer {
  server: http.Server;
  close: () => Promise<void>;
  baseUrl: string;
}

export async function startKommoMock(port: number = 9999): Promise<KommoMockServer> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '', `http://localhost:${port}`);
    console.log(`[KommoMock] ${req.method} ${url.pathname}`);

    res.setHeader('Content-Type', 'application/json');

    // Mocks
    if (url.pathname.match(/^\/api\/v4\/leads\/\d+/)) {
        // Extract ID
        const id = url.pathname.split('/')[4];
        
        // Return a mock lead
        // We need to support 'with=contacts' logic
        // We can check the query params if needed, but returning full object is safer.
        
        // We need to return what route.ts expects.
        // It expects `custom_fields_values`.
        // My test sends `custom_fields_values` in the webhook payload, BUT route.ts fetches the lead again!
        // So I must return the SAME data I sent in the webhook payload (or what I want the system to see).
        
        // To make it dynamic, I can store "leads" in a map, or just echo back a standard structure based on ID?
        // Or I can just return a generic valid lead with the fields I care about.
        // Since the test sends specific fields (Prepayment, Dates), I should probably return them here too.
        // But how do I know what the test sent?
        // I can make the mock stateful or just hardcode for the specific test IDs?
        
        // Let's make a simple stateful store
        const leadData = leadsStore.get(id);
        if (leadData) {
            res.writeHead(200);
            res.end(JSON.stringify(leadData));
            return;
        }

        // Default fallback if not found (or return 404)
        res.writeHead(404);
        res.end(JSON.stringify({ title: 'Not Found' }));
        return;
    }

    if (url.pathname.match(/^\/api\/v4\/contacts\/\d+/)) {
        const id = url.pathname.split('/')[4];
        const contactData = contactsStore.get(id);
        if (contactData) {
            res.writeHead(200);
            res.end(JSON.stringify(contactData));
            return;
        }
        
        // Fallback contact
        res.writeHead(200);
        res.end(JSON.stringify({
            id: Number(id),
            name: 'Mock Contact',
            custom_fields_values: [
                { field_code: 'PHONE', values: [{ value: '+971500000000' }] },
                { field_code: 'EMAIL', values: [{ value: 'mock@example.com' }] }
            ]
        }));
        return;
    }
    
    if (url.pathname.match(/\/files$/)) {
        res.writeHead(200);
        res.end(JSON.stringify({ _embedded: { files: [] } }));
        return;
    }
    
    // Account endpoint for drive url
    if (url.pathname === '/api/v4/account') {
        res.writeHead(200);
        res.end(JSON.stringify({ drive_url: 'http://localhost:9999/drive' }));
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Kommo Mock listening on port ${port}`);
      resolve({
        server,
        baseUrl: `http://localhost:${port}`,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}

// Simple in-memory store to configure mocks from tests
export const leadsStore = new Map<string, any>();
export const contactsStore = new Map<string, any>();

export function setupMockLead(id: string, data: any) {
    leadsStore.set(id, data);
}

export function setupMockContact(id: string, data: any) {
    contactsStore.set(id, data);
}
