import http from 'http';

export interface KommoMockServer {
  server: http.Server;
  close: () => Promise<void>;
  baseUrl: string;
}

export const requests: { method: string; url: string; body: any }[] = [];
export const leadsStore = new Map<string, any>();
export const contactsStore = new Map<string, any>();

export function clearRequests() {
    requests.length = 0;
}

export function setupMockLead(id: string, data: any) {
    leadsStore.set(id, data);
}

export function setupMockContact(id: string, data: any) {
    contactsStore.set(id, data);
}

export async function startKommoMock(port: number = 9999): Promise<KommoMockServer> {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://localhost:${port}`);
    
    // Read body
    const buffers = [];
    for await (const chunk of req) {
        buffers.push(chunk);
    }
    const bodyStr = Buffer.concat(buffers).toString();
    let body: any = {};
    try {
        if (bodyStr) body = JSON.parse(bodyStr);
    } catch (e) {
        body = bodyStr;
    }

    console.log(`[KommoMock] ${req.method} ${url.pathname}`);
    requests.push({ method: req.method || 'GET', url: url.pathname, body });

    res.setHeader('Content-Type', 'application/json');

    // --- KOMMO MOCKS ---

    if (url.pathname.match(/^\/api\/v4\/leads\/\d+/)) {
        const id = url.pathname.split('/')[4];
        
        if (req.method === 'PATCH') {
            // Update the lead in store
            const existing = leadsStore.get(id) || {};
            // Merge custom fields is hard, just shallow merge or minimal update
            const newStatus = body.status_id;
            if (newStatus) existing.status_id = newStatus;
            leadsStore.set(id, { ...existing, ...body });
            
            res.writeHead(200);
            res.end(JSON.stringify(existing));
            return;
        }

        const leadData = leadsStore.get(id);
        if (leadData) {
            res.writeHead(200);
            res.end(JSON.stringify(leadData));
            return;
        }
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

    // --- ZOHO MOCKS ---

    // GET /zoho/organizations
    if (url.pathname === '/zoho/organizations') {
         res.writeHead(200);
         res.end(JSON.stringify({
             code: 0,
             message: 'success',
             organizations: [{ organization_id: 'test-org-123', name: 'Test Org' }]
         }));
         return;
    }

    // GET /zoho/contacts
    if (url.pathname === '/zoho/contacts' && req.method === 'GET') {
        // Search logic? Return empty to force creation, or return one if needed.
        // If query params has contact_name...
        // Let's just return empty list to exercise creation flow
        res.writeHead(200);
        res.end(JSON.stringify({
            code: 0,
            message: 'success',
            contacts: [] 
        }));
        return;
    }

    // POST /zoho/contacts
    if (url.pathname === '/zoho/contacts' && req.method === 'POST') {
        res.writeHead(201);
        res.end(JSON.stringify({
            code: 0,
            message: 'The contact has been added.',
            contact: { contact_id: 'zoho-contact-123', contact_name: 'Test Contact' }
        }));
        return;
    }

    // POST /zoho/salesorders
    if (url.pathname === '/zoho/salesorders' && req.method === 'POST') {
        res.writeHead(201);
        res.end(JSON.stringify({
            code: 0,
            message: 'The sales order has been created.',
            salesorder: { salesorder_id: 'zoho-so-999', salesorder_number: 'SO-001' }
        }));
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
