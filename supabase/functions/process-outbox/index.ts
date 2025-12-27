import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"

const BATCH_SIZE = Number(Deno.env.get("OUTBOX_BATCH_SIZE") ?? 20)
const MAX_ATTEMPTS = Number(Deno.env.get("OUTBOX_MAX_ATTEMPTS") ?? 5)
const FEATURE_FLAG_KEY = 'enableZohoLive'

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

async function isFeatureFlagEnabled(client: SupabaseClient, flag: string) {
  const { data } = await client
    .from('system_feature_flags')
    .select('is_enabled')
    .eq('flag', flag)
    .maybeSingle()

  return data?.is_enabled ?? false
}

async function sendTelegramMessage(message: string) {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || '7719759217:AAEwerFTBeo3erPBfFHNWA-b62Iu-NpN-94'
  const chatId = Deno.env.get("TELEGRAM_DEFAULT_CHAT_ID") || '-1003305843739'

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  })

  const data = await response.json()
  if (!data.ok) {
    throw new Error(`Telegram API Error: ${JSON.stringify(data)}`)
  }
}

async function handleTelegramJob(supabase: SupabaseClient, eventType: string, payload: any) {
  if (eventType === 'task_created') {
    const taskId = payload.task_id
    if (!taskId) throw new Error("Missing task_id in payload")

    // Fetch task details
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        bookings ( external_code ),
        vehicles ( name, plate_number ),
        clients ( name ),
        driver_profiles:assignee_driver_id (
          staff_accounts (
            full_name
          )
        )
      `)
      .eq('id', taskId)
      .single()

    if (error || !task) throw new Error(`Task not found: ${error?.message}`)

    // Construct message
    const taskType = task.task_type === 'delivery' ? 'Delivery' : (task.task_type === 'pickup' ? 'Pickup' : task.task_type)
    const title = task.title || 'Untitled Task'
    const bookingCode = task.bookings?.external_code || 'N/A'
    const vehicleName = task.vehicles?.name || 'Unknown Vehicle'
    const plateNumber = task.vehicles?.plate_number || 'No Plate'
    const clientName = task.clients?.name || 'Unknown Client'
    // @ts-ignore
    const driverName = task.driver_profiles?.staff_accounts?.full_name || 'Unassigned'
    const deadline = task.deadline_at ? new Date(task.deadline_at).toLocaleString('ru-RU', { timeZone: 'Asia/Dubai' }) : 'No Deadline'

    const message = `
🆕 <b>New Task Created</b>

<b>Type:</b> ${taskType}
<b>Title:</b> ${title}
<b>Booking:</b> ${bookingCode}
<b>Vehicle:</b> ${vehicleName} (${plateNumber})
<b>Client:</b> ${clientName}
<b>Driver:</b> ${driverName}
<b>Deadline:</b> ${deadline}
`.trim()
    await sendTelegramMessage(message)
    return
  }

  if (eventType === 'sales_order_linked') {
    const bookingId = payload.booking_id
    const salesOrderId = payload.sales_order_id
    const salesOrderUrl = payload.sales_order_url
    const isNew = payload.is_new

    if (!bookingId) throw new Error("Missing booking_id in payload")

    // Fetch booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        external_code,
        vehicles ( name, plate_number ),
        clients ( name ),
        total_amount
      `)
      .eq('id', bookingId)
      .single()

    if (error || !booking) throw new Error(`Booking not found: ${error?.message}`)

    const bookingCode = booking.external_code || 'N/A'
    const vehicleName = booking.vehicles?.name || 'Unknown Vehicle'
    const plateNumber = booking.vehicles?.plate_number || 'No Plate'
    const clientName = booking.clients?.name || 'Unknown Client'
    const amount = booking.total_amount ? `${booking.total_amount} AED` : 'N/A'
    const action = isNew ? 'Created' : 'Updated'
    const icon = isNew ? '✅' : '🔄'

    const message = `
${icon} <b>Sales Order ${action}</b>

<b>Booking:</b> ${bookingCode}
<b>Sales Order:</b> <a href="${salesOrderUrl}">Link</a>
<b>Client:</b> ${clientName}
<b>Auto:</b> ${vehicleName}
<b>Plate:</b> ${plateNumber}
<b>Amount:</b> ${amount}
`.trim()

    await sendTelegramMessage(message)
    return
  }

  throw new Error(`Unknown event type: ${eventType}`)
}

serve(async () => {
  try {
    const supabase = getServiceClient()
    const { data: jobs, error } = await supabase
      .from("integrations_outbox")
      .select("id, target_system, event_type, payload, attempts")
      .eq("status", "pending")
      .lte("next_run_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE)

    if (error) {
      console.error("Failed to fetch outbox jobs", error)
      return new Response(JSON.stringify({ error: "fetch_failed" }), { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ status: "idle" }), { status: 200 })
    }

    const enableZoho = await isFeatureFlagEnabled(supabase, FEATURE_FLAG_KEY)
    const results = []

    for (const job of jobs) {
      if (job.attempts >= MAX_ATTEMPTS) {
        const { error: failureError } = await supabase
          .from("integrations_outbox")
          .update({ status: "failed", last_error: "max_attempts" })
          .eq("id", job.id)
        if (failureError) {
          console.error("Failed to mark job as failed", { jobId: job.id, failureError })
        }
        results.push({ id: job.id, status: "failed", reason: "max_attempts" })
        continue
      }

      // Handle Telegram Jobs
      if (job.target_system === 'telegram') {
        try {
          await handleTelegramJob(supabase, job.event_type, job.payload)
          
          const { error: successError } = await supabase
            .from("integrations_outbox")
            .update({
              status: "succeeded",
              attempts: job.attempts + 1,
              response: { mode: "live", processed_at: new Date().toISOString() },
            })
            .eq("id", job.id)

          if (successError) {
             console.error("Failed to update telegram job success", { jobId: job.id, successError })
          }
          results.push({ id: job.id, status: "succeeded", mode: "live" })
        } catch (err: any) {
          console.error("Failed to process Telegram job", err)
          const { error: updateError } = await supabase
            .from("integrations_outbox")
            .update({
              status: "pending", // Retry
              attempts: job.attempts + 1,
              last_error: err.message,
              next_run_at: new Date(Date.now() + 60000).toISOString() // Retry in 1 min
            })
            .eq("id", job.id)
            
          if (updateError) console.error("Failed to update job status", updateError)
          results.push({ id: job.id, status: "retrying", error: err.message })
        }
        continue
      }

      // Handle Zoho Jobs (Stubbed or Live)
      if (!enableZoho) {
        const { error: stubError } = await supabase
          .from("integrations_outbox")
          .update({
            status: "succeeded",
            attempts: job.attempts + 1,
            response: { mode: "stubbed", processed_at: new Date().toISOString() },
          })
          .eq("id", job.id)
        if (stubError) {
          console.error("Failed to stub job", { jobId: job.id, stubError })
          continue
        }
        results.push({ id: job.id, status: "succeeded", mode: "stubbed" })
        continue
      }

      // Placeholder for live Zoho dispatch. For now, mark as processing and immediately succeeded.
      const { error: liveError } = await supabase
        .from("integrations_outbox")
        .update({
          status: "succeeded",
          attempts: job.attempts + 1,
          response: { mode: "live-placeholder", processed_at: new Date().toISOString() },
        })
        .eq("id", job.id)
      if (liveError) {
        console.error("Failed to update live placeholder job", { jobId: job.id, liveError })
        continue
      }
      results.push({ id: job.id, status: "succeeded", mode: "live-placeholder" })
    }

    return new Response(JSON.stringify({ status: "processed", results }), { status: 200 })
  } catch (error) {
    console.error("process-outbox error", error)
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
  }
})
