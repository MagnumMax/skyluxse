import { test, expect } from '@playwright/test';
import { createTestClient, createTestVehicle, cleanupTestData, supabase } from './fixtures/supabase';
import { startKommoMock, KommoMockServer, setupMockLead, setupMockContact } from './fixtures/kommo-mock';

// Run tests in this file serially to avoid port conflicts with the mock server
test.describe.configure({ mode: 'serial' });

test.describe('Kommo Webhooks', () => {
  let clientId: string;
  let vehicleId: string;
  let vehicleKommoId: string;
  let bookingId: string | undefined;
  let leadId: string;
  let mockServer: KommoMockServer;

  test.beforeAll(async () => {
    // Try to start on 9999, if fails, we might need retry or just assume serial fixes it
    try {
        mockServer = await startKommoMock(9999);
    } catch (e) {
        console.error('Failed to start mock server', e);
        throw e;
    }

    const client = await createTestClient();
    clientId = client.id;
    const vehicle = await createTestVehicle();
    vehicleId = vehicle.id;
    vehicleKommoId = `TEST-KOMMO-${Date.now()}`;
    await supabase.from('vehicles').update({ kommo_vehicle_id: vehicleKommoId }).eq('id', vehicleId);
    
    leadId = `1970${Math.floor(Math.random() * 10000)}`; // Use numeric string as Kommo IDs are usually numbers
    
    // Setup Mock Lead Data
    // We need to match what we send in the webhook or what route.ts expects to fetch
    const mockLead = {
        id: Number(leadId),
        name: `Test Lead ${leadId}`,
        status_id: 96150292,
        pipeline_id: 9815931,
        custom_fields_values: [
            {
                field_id: 1234163, // Vehicle
                values: [{ value: vehicleKommoId }] 
            },
            {
                field_id: 1233272, // Advance Payment
                values: [{ value: 0 }]
            }
        ],
        _embedded: {
            contacts: [
                { id: 12345, is_main: true }
            ]
        }
    };
    setupMockLead(leadId, mockLead);
    
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

  test('should handle Kommo status change to "Waiting for Payment" (No Prepayment)', async ({ request }) => {
    // Update mock for this test scenario if needed, or rely on initial setup
    const payload = {
      leads: {
        status: [
          {
            id: leadId,
            status_id: '96150292', // Waiting for Payment
            pipeline_id: '9815931',
            custom_fields_values: [
                {
                    field_id: 1234163,
                    values: [{ value: vehicleKommoId }] 
                }
            ]
          }
        ]
      }
    };

    const response = await request.post('/api/integrations/kommo/webhook', {
      data: payload
    });

    expect(response.status()).toBe(200);
    
    // Wait for processing (route.ts is async but awaits handleStatusChange)
    
    const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('source_payload_id', `kommo:${leadId}`)
        .single();
    
    expect(booking).toBeDefined();
    if (booking) {
        expect(booking.status).toBe('confirmed');
        bookingId = booking.id;
    }
  });

  test('should handle Kommo status change with Prepayment', async ({ request }) => {
    // Update mock to reflect prepayment
    const mockLead = {
        id: Number(leadId),
        name: `Test Lead ${leadId}`,
        status_id: 96150292,
        pipeline_id: 9815931,
        custom_fields_values: [
            { field_id: 1234163, values: [{ value: vehicleKommoId }] },
            { field_id: 1233272, values: [{ value: 500 }] } // Advance Payment
        ],
        _embedded: { contacts: [{ id: 12345 }] }
    };
    setupMockLead(leadId, mockLead);

    const payload = {
        leads: {
          status: [
            {
              id: leadId,
              status_id: '96150292',
              pipeline_id: '9815931'
            }
          ]
        }
      };
  
      const response = await request.post('/api/integrations/kommo/webhook', {
        data: payload
      });
      expect(response.status()).toBe(200);

      const { data: booking } = await supabase
        .from('bookings')
        .select('advance_payment, status')
        .eq('source_payload_id', `kommo:${leadId}`)
        .single();
      
      expect(booking).toBeDefined();
      if (booking) {
        expect(booking.advance_payment).toBe(500);
        expect(booking.status).toBe('confirmed');
      }
  });

  test('should create Delivery task when status changes to "Delivery Within 24 Hours"', async ({ request }) => {
    const now = Math.floor(Date.now() / 1000);
    const startAt = now + 3600; // +1 hour
    const endAt = now + 86400 * 2;

    // Update mock with dates
    const mockLead = {
        id: Number(leadId),
        name: `Test Lead ${leadId}`,
        status_id: 75440395,
        price: 1000,
        pipeline_id: 9815931,
        custom_fields_values: [
            { field_id: 1234163, values: [{ value: vehicleKommoId }] },
            { field_id: 1218176, values: [{ value: startAt }] }, // Delivery Date
            { field_id: 1218178, values: [{ value: endAt }] }  // Collect Date
        ],
        _embedded: { contacts: [{ id: 12345 }] }
    };
    setupMockLead(leadId, mockLead);

    const payload = {
        leads: {
          status: [
            {
              id: leadId,
              status_id: '75440395', // Delivery Within 24 Hours
              pipeline_id: '9815931'
            }
          ]
        }
      };

      const response = await request.post('/api/integrations/kommo/webhook', {
        data: payload
      });
      expect(response.status()).toBe(200);

      // Verify Booking Status
      const { data: booking } = await supabase
        .from('bookings')
        .select('status, id')
        .eq('source_payload_id', `kommo:${leadId}`)
        .single();
      
      expect(booking).toBeDefined();
      if (booking) {
        expect(booking.status).toBe('delivery');
        
        // Verify Task Creation
        await expect.poll(async () => {
            const { data } = await supabase
                .from('tasks')
                .select('*')
                .eq('booking_id', booking.id)
                .eq('task_type', 'delivery');
            return data?.length;
        }, {
            message: 'Delivery task should be created',
            timeout: 5000,
        }).toBeGreaterThan(0);
      }
  });

  test('should create Pickup task when status changes to "Pick Up Within 24 Hours"', async ({ request }) => {
    const now = Math.floor(Date.now() / 1000);
    const startAt = now + 3600; 
    const endAt = now + 86400 * 2; // +2 days

    // Update mock with dates and status
    const mockLead = {
        id: Number(leadId),
        name: `Test Lead ${leadId}`,
        status_id: 76475495,
        pipeline_id: 9815931,
        custom_fields_values: [
            { field_id: 1234163, values: [{ value: vehicleKommoId }] },
            { field_id: 1218176, values: [{ value: startAt }] }, 
            { field_id: 1218178, values: [{ value: endAt }] } 
        ],
        _embedded: { contacts: [{ id: 12345 }] }
    };
    setupMockLead(leadId, mockLead);

    const payload = {
        leads: {
          status: [
            {
              id: leadId,
              status_id: '76475495', // Pick Up Within 24 Hours
              pipeline_id: '9815931'
            }
          ]
        }
      };

      const response = await request.post('/api/integrations/kommo/webhook', {
        data: payload
      });
      expect(response.status()).toBe(200);

      // Verify Booking Status
      const { data: booking } = await supabase
        .from('bookings')
        .select('status, id')
        .eq('source_payload_id', `kommo:${leadId}`)
        .single();
      
      expect(booking).toBeDefined();
      if (booking) {
        expect(booking.status).toBe('in_progress'); // Mapped from 76475495
        
        // Verify Pickup Task Creation
        await expect.poll(async () => {
            const { data } = await supabase
                .from('tasks')
                .select('*')
                .eq('booking_id', booking.id)
                .eq('task_type', 'pickup');
            return data?.length;
        }, {
            message: 'Pickup task should be created',
            timeout: 5000,
        }).toBeGreaterThan(0);
      }
  });
});
