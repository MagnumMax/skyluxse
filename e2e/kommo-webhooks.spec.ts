import { test, expect } from '@playwright/test';
import { createTestClient, createTestVehicle, cleanupTestData, supabase } from './fixtures/supabase';
import { startKommoMock, KommoMockServer, setupMockLead, setupMockContact, requests, clearRequests } from './fixtures/kommo-mock';

// Run tests in this file serially to emulate lead lifecycle
test.describe.configure({ mode: 'serial' });

test.describe('Kommo Webhooks Sequential Flow', () => {
  let clientId: string;
  let vehicleId: string;
  let vehicleKommoId: string;
  let bookingId: string | undefined;
  let leadId: string;
  let mockServer: KommoMockServer;

  test.beforeAll(async () => {
    // Start mock server
    try {
        mockServer = await startKommoMock(9999);
    } catch (e) {
        console.error('Failed to start mock server', e);
        throw e;
    }

    // Create test data
    const client = await createTestClient();
    clientId = client.id;
    const vehicle = await createTestVehicle();
    vehicleId = vehicle.id;
    vehicleKommoId = `TEST-KOMMO-${Date.now()}`;
    await supabase.from('vehicles').update({ kommo_vehicle_id: vehicleKommoId, zoho_item_id: 'zoho-item-123' }).eq('id', vehicleId);
    
    leadId = `1970${Math.floor(Math.random() * 10000)}`;
    
    setupMockContact('12345', {
        id: 12345,
        name: 'Test Contact',
        custom_fields_values: [
            { field_id: 123, field_code: 'PHONE', values: [{ value: '+971500000000' }] },
            { field_id: 124, field_code: 'EMAIL', values: [{ value: 'test@example.com' }] }
        ]
    });
  });

  test.afterAll(async () => {
    if (mockServer) await mockServer.close();

    if (!bookingId && leadId) {
        const { data } = await supabase.from('bookings').select('id').eq('source_payload_id', `kommo:${leadId}`).maybeSingle();
        if (data) bookingId = data.id;
    }
    await cleanupTestData({ clientId, vehicleId, bookingId });
  });

  test('Step 1: "Sales order sent" with Prepayment -> Create Booking, Zoho Order, Update Kommo Status', async ({ request }) => {
    clearRequests();

    // 1. Setup Mock Lead with Prepayment
    const mockLead = {
        id: Number(leadId),
        name: `Test Lead ${leadId}`,
        status_id: 98035992, // Sales order sent
        pipeline_id: 9815931,
        price: 1000,
        custom_fields_values: [
            { field_id: 1234163, values: [{ value: vehicleKommoId }] }, // Vehicle
            { field_id: 1233272, values: [{ value: 500 }] }, // Advance Payment
            { field_id: 1218176, values: [{ value: Math.floor(Date.now() / 1000) + 3600 }] }, // Start
            { field_id: 1218178, values: [{ value: Math.floor(Date.now() / 1000) + 86400 }] }  // End
        ],
        _embedded: { contacts: [{ id: 12345 }] }
    };
    setupMockLead(leadId, mockLead);

    // 2. Send Webhook
    const payload = {
      leads: {
        status: [
          {
            id: leadId,
            status_id: '98035992',
            pipeline_id: '9815931'
          }
        ]
      }
    };

    const response = await request.post('/api/integrations/kommo/webhook', {
      data: payload
    });
    expect(response.status()).toBe(200);

    // 3. Verify Booking Creation
    await expect.poll(async () => {
        const { data } = await supabase
            .from('bookings')
            .select('*')
            .eq('source_payload_id', `kommo:${leadId}`)
            .single();
        if (data) bookingId = data.id;
        return data;
    }, {
        message: 'Booking should be created',
        timeout: 10000,
    }).toBeDefined();

    // 4. Verify Booking Data
    const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    expect(booking.advance_payment).toBe(500);
    expect(booking.status).toBe('preparation');

    // 5. Verify Zoho Sales Order Creation (System initiated)
    // Check DB update
    expect(booking.zoho_sales_order_id).toBe('zoho-so-999'); // From Mock
    expect(booking.sales_order_url).toContain('salesorders/zoho-so-999');

    // Check Mock Request
    const zohoRequest = requests.find(r => r.url === '/zoho/salesorders' && r.method === 'POST');
    expect(zohoRequest).toBeDefined();

    // 6. Verify Kommo Lead Status Transition to "Payment pending"
    // Since prepayment > 0, it should transition to 96150292
    await expect.poll(() => {
        return requests.find(r => 
            r.url === `/api/v4/leads/${leadId}` && 
            r.method === 'PATCH' &&
            r.body.status_id === 96150292 // Payment pending
        );
    }, {
        message: 'Should attempt to update Kommo status to Payment pending',
        timeout: 5000
    }).toBeDefined();
  });

  test('Step 2: Delivery Task Creation', async ({ request }) => {
    // 1. Update Mock Status
    const mockLead = {
        id: Number(leadId),
        status_id: 75440395, // Delivery Within 24 Hours
        pipeline_id: 9815931,
        // Keep other fields
        custom_fields_values: [
            { field_id: 1234163, values: [{ value: vehicleKommoId }] },
            { field_id: 1233272, values: [{ value: 500 }] }
        ]
    };
    setupMockLead(leadId, mockLead);

    // 2. Send Webhook
    const payload = {
        leads: {
          status: [
            {
              id: leadId,
              status_id: '75440395',
              pipeline_id: '9815931'
            }
          ]
        }
      };

      const response = await request.post('/api/integrations/kommo/webhook', {
        data: payload
      });
      expect(response.status()).toBe(200);

      // 3. Verify Booking Status
      const { data: booking } = await supabase
        .from('bookings')
        .select('status, id')
        .eq('id', bookingId)
        .single();
      
      expect(booking).not.toBeNull();
      expect(booking!.status).toBe('delivery');

      // 4. Verify Task Creation and Driver Visibility
      await expect.poll(async () => {
          const { data } = await supabase
              .from('tasks')
              .select('*')
              .eq('booking_id', bookingId)
              .eq('task_type', 'delivery');
          return data;
      }, {
          message: 'Delivery task should be created',
          timeout: 5000,
      }).toHaveLength(1);

      const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('booking_id', bookingId)
          .eq('task_type', 'delivery');
        
      const task = tasks![0];
      // "Appeared for driver" -> Status is open (unassigned) or assigned (if logic assigns it)
      // Usually it starts as 'todo' or 'open'
      expect(['todo', 'open', 'pending', 'assigned']).toContain(task.status);
      
      // Also ensure it has a start/end time or deadline so it appears on board
      expect(task.deadline_at).toBeDefined();
  });
});
