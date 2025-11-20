import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL env var')
}

if (!serviceKey) {
  throw new Error('[supabase] Missing SUPABASE_SERVICE_ROLE_KEY env var (server-side only)')
}

const serviceClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
  },
})

async function queryBooking() {
  const { data, error } = await serviceClient
    .from('bookings')
    .select('*, vehicles(name)')
    .eq('source_payload_id', 'kommo:19709337')
    .single()

  if (error) {
    console.error('Error querying booking:', error)
    return
  }

  console.log('Booking details:', JSON.stringify(data, null, 2))

  const vehicleName = data.vehicles?.name || 'Unknown'
  const status = data.status

  console.log(`${vehicleName}, ${status}`)
}

queryBooking()