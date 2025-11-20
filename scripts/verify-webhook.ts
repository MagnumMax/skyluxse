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

async function verifyWebhook() {
  const payload = {
    "leads": {
      "status": [
        {
          "id": "19709337",
          "status_id": "75440639",
          "pipeline_id": "9815931",
          "old_status_id": "76475495",
          "old_pipeline_id": "9815931"
        }
      ]
    },
    "account": {
      "id": "33655751",
      "subdomain": "infoskyluxsecom"
    }
  }

  // Send POST request to webhook endpoint
  const response = await fetch('http://localhost:3000/api/integrations/kommo/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    console.error('Failed to send webhook request:', response.status, response.statusText)
    return
  }

  // Wait a bit for processing
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Check kommo_webhook_events for new event
  const { data: webhookEvents, error: webhookError } = await serviceClient
    .from('kommo_webhook_events')
    .select('*')
    .eq('source_payload_id', '19709337')
    .order('created_at', { ascending: false })
    .limit(1)

  if (webhookError) {
    console.error('Error querying kommo_webhook_events:', webhookError)
    return
  }

  if (!webhookEvents || webhookEvents.length === 0) {
    console.error('No webhook event found for lead 19709337')
    return
  }

  // Check booking
  const { data: booking, error: bookingError } = await serviceClient
    .from('bookings')
    .select('*')
    .eq('source_payload_id', 'kommo:19709337')
    .single()

  if (bookingError) {
    console.error('Error querying booking:', bookingError)
    return
  }

  // Confirm kommo_status_id
  if (booking.kommo_status_id !== 75440639) {
    console.error('Incorrect kommo_status_id:', booking.kommo_status_id, 'expected: 75440639')
    return
  }

  // Query vehicle name
  if (!booking.vehicle_id) {
    console.log('No vehicle associated with booking')
    return
  }

  const { data: vehicle, error: vehicleError } = await serviceClient
    .from('vehicles')
    .select('name')
    .eq('id', booking.vehicle_id)
    .single()

  if (vehicleError) {
    console.error('Error querying vehicle:', vehicleError)
    return
  }

  console.log(`${vehicle.name}, ${booking.status}`)
}

verifyWebhook()