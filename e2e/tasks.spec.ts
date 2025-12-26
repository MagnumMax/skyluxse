import { test, expect } from '@playwright/test';
import { createTestBooking, createTestClient, createTestVehicle, createTestUser, cleanupTestData, supabase } from './fixtures/supabase';

// Run tests in this file serially
test.describe.configure({ mode: 'serial' });

test.describe('Task and Booking Flows', () => {
  let clientId: string;
  let vehicleId: string;
  let bookingId: string;
  let bookingCode: string;
  let userId: string;
  let userEmail: string;
  let userPass: string;
  let taskIds: string[] = [];

  test.beforeAll(async () => {
    // Create test data
    const client = await createTestClient();
    clientId = client.id;
    const vehicle = await createTestVehicle();
    vehicleId = vehicle.id;
    const booking = await createTestBooking(clientId, vehicleId);
    bookingId = booking.id;
    bookingCode = booking.external_code;
    
    // Create test user
    const user = await createTestUser();
    userId = user.id;
    userEmail = user.email;
    userPass = user.password;
    
    console.log(`Setup: Client ${clientId}, Vehicle ${vehicleId}, Booking ${bookingId} (${bookingCode}), User ${userId}`);
  });

  test.afterAll(async () => {
    await cleanupTestData({ clientId, vehicleId, bookingId, taskIds, userId });
  });

  test.beforeEach(async ({ page }) => {
    // Programmatic login to bypass UI flakiness
    const { data } = await supabase.auth.signInWithPassword({ email: userEmail, password: userPass });
    if (!data.session) {
        throw new Error('Could not get session from Supabase');
    }

    // Parse project ref from URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    let projectRef = 'supabase-token'; // Fallback
    try {
        const url = new URL(supabaseUrl);
        const parts = url.hostname.split('.');
        if (parts.length > 0) {
            projectRef = parts[0];
        }
    } catch (e) {
        console.warn('Could not parse Supabase URL, using fallback key');
    }
    
    const storageKey = `sb-${projectRef}-auth-token`;

    await page.goto('/login'); // Go to a page to set local storage
    
    await page.evaluate(({ key, session }) => {
        localStorage.setItem(key, JSON.stringify(session));
    }, { key: storageKey, session: data.session });

    // Force reload/navigation
    await page.goto('/fleet-calendar');
    await expect(page).not.toHaveURL(/.*login/);
  });

  test('should create tasks via API for a valid booking', async ({ request }) => {
    // The API route is protected by CHATBOT_API_KEY, not user auth
    const apiKey = process.env.CHATBOT_API_KEY;
    if (!apiKey) {
      test.skip('CHATBOT_API_KEY not set', () => {});
      return;
    }

    const response = await request.post('/api/tasks/create', {
      headers: {
        'x-api-key': apiKey,
      },
      data: {
        bookingId: bookingId,
        modes: ['delivery', 'pickup']
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('created');
    expect(Array.isArray(body.created)).toBe(true);
    expect(body.created.length).toBeGreaterThan(0);
    
    taskIds.push(...body.created);

    // Verify in DB
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .in('id', body.created);
    
    expect(tasks).toBeDefined();
    expect(tasks?.length).toBe(body.created.length);
    expect(tasks?.[0].booking_id).toBe(bookingId);
    expect(tasks?.[0].assignee_driver_id).toBe('07c91c85-62c8-44dd-8351-ef78826e633f');
  });

  test('should display created tasks on the Driver Tasks Board', async ({ page }) => {
    await page.goto('/driver/tasks');

    // Wait for tasks to load
    // Expect at least one task with the booking code
    await expect(page.getByText(`#${bookingCode}`).first()).toBeVisible();
    
    // Check for "Delivery" and "Pickup" titles
    await expect(page.getByText('Delivery').first()).toBeVisible();
  });

  test('should display booking detail page correctly', async ({ page }) => {
    await page.goto(`/bookings/${bookingId}`);
    
    // Check title contains booking code (using locator for h1 to be specific)
    await expect(page.locator('h1')).toContainText(bookingCode);
    
    // Check client name is visible (use first() to handle multiple occurrences)
    await expect(page.getByText('Test Client Playwright').first()).toBeVisible();

    // Check "Create Sales Order" button existence (Exploratory) - Disabled as button is currently not in UI
    // const createSOBtn = page.getByRole('button', { name: /create sales order/i });
    // if (await createSOBtn.count() > 0) {
    //     console.log('Create Sales Order button found');
    //     await expect(createSOBtn).toBeVisible();
    // } else {
    //     console.log('Create Sales Order button NOT found on this page');
    // }
  });
});
