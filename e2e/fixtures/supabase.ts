import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

export async function createTestUser() {
  const email = `test-user-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  const password = 'Password123!';
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Test User' }
  });

  if (error) throw error;
  
  // Create staff account for this user to have access
  await supabase.from('staff_accounts').insert({
    id: data.user.id,
    full_name: 'Test User',
    email: email,
    role: 'operations', // Give operations role
    is_active: true
  });

  return { email, password, id: data.user.id };
}

export async function createTestClient() {
  const email = `test-client-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: 'Test Client Playwright',
      email,
      phone: '+971500000000',
      segment: 'general'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTestVehicle() {
    const plate = `T-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;
    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        name: 'Test Vehicle Playwright',
        plate_number: plate,
        status: 'available',
        class: 'sedan'
      })
      .select()
      .single();
  
    if (error) throw error;
    return data;
  }

export async function createTestBooking(clientId: string, vehicleId: string) {
  const code = `BK-TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      client_id: clientId,
      vehicle_id: vehicleId,
      status: 'confirmed',
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 86400000).toISOString(), // +1 day
      external_code: code,
      total_amount: 500,
      delivery_location: 'Dubai Mall',
      collect_location: 'DXB Airport'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cleanupTestData(ids: { bookingId?: string; clientId?: string; vehicleId?: string; taskIds?: string[]; userId?: string }) {
    // Delete tasks explicitly by ID if provided
    if (ids.taskIds?.length) {
        const { error } = await supabase.from('tasks').delete().in('id', ids.taskIds);
        if (error) console.error('Error cleaning up tasks by IDs:', error);
    }

    // Delete tasks linked to the booking (if any) before deleting the booking
    if (ids.bookingId) {
        const { error: tasksError } = await supabase.from('tasks').delete().eq('booking_id', ids.bookingId);
        if (tasksError) console.error('Error cleaning up tasks by bookingId:', tasksError);

        const { error: bookingError } = await supabase.from('bookings').delete().eq('id', ids.bookingId);
        if (bookingError) console.error('Error cleaning up booking:', bookingError);
    }

    if (ids.clientId) {
        const { error } = await supabase.from('clients').delete().eq('id', ids.clientId);
        if (error) console.error('Error cleaning up client:', error);
    }

    if (ids.vehicleId) {
        const { error } = await supabase.from('vehicles').delete().eq('id', ids.vehicleId);
        if (error) console.error('Error cleaning up vehicle:', error);
    }

    if (ids.userId) {
        const { error: staffError } = await supabase.from('staff_accounts').delete().eq('id', ids.userId);
        if (staffError) console.error('Error cleaning up staff account:', staffError);

        const { error: authError } = await supabase.auth.admin.deleteUser(ids.userId);
        if (authError) console.error('Error cleaning up auth user:', authError);
    }
}
