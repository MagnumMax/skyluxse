import { serviceClient } from './lib/supabase/service-client.ts';

const payload = {
  "leads": {
    "status": [
      {
        "id": "19763833",
        "status_id": "75440395",
        "pipeline_id": "9815931",
        "old_status_id": "75440391",
        "old_pipeline_id": "9815931"
      }
    ]
  },
  "account": {
    "id": "33655751",
    "subdomain": "infoskyluxsecom"
  }
};

async function main() {
  console.log('Sending webhook payload...');

  try {
    const response = await fetch('http://localhost:3000/api/integrations/kommo/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Webhook response:', result);
  } catch (error) {
    console.error('Error sending webhook:', error);
    return;
  }

  // Wait a bit for processing
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Checking kommo_webhook_events for new entry...');

  try {
    const { data: events, error } = await serviceClient
      .from('kommo_webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error querying webhook events:', error);
      return;
    }

    if (events && events.length > 0) {
      const latestEvent = events[0];
      console.log('Latest webhook event:', {
        id: latestEvent.id,
        status: latestEvent.status,
        created_at: latestEvent.created_at,
        payload: latestEvent.payload,
      });
    } else {
      console.log('No webhook events found');
    }
  } catch (error) {
    console.error('Error querying webhook events:', error);
  }

  console.log('Checking if booking for lead ID 19763833 was updated...');

  try {
    const { data: bookings, error } = await serviceClient
      .from('bookings')
      .select('*')
      .eq('source_payload_id', '19763833')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error querying bookings:', error);
      return;
    }

    if (bookings && bookings.length > 0) {
      const booking = bookings[0];
      console.log('Booking found:', {
        id: booking.id,
        external_code: booking.external_code,
        status: booking.status,
        updated_at: booking.updated_at,
        source_payload_id: booking.source_payload_id,
      });
    } else {
      console.log('No booking found with source_payload_id 19763833');
    }
  } catch (error) {
    console.error('Error querying bookings:', error);
  }
}

main().catch(console.error);