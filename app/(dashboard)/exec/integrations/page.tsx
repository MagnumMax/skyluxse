import {
  IntegrationsOutboxDashboard,
  type KommoImportRunRow,
  type OutboxDashboardJob,
  type KommoWebhookEventRow,
} from "@/components/integrations-outbox-dashboard"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing Supabase credentials for integrations dashboard")
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

type BookingLookupValue = {
  id: string
  external_code: string | null
  status: string | null
  client_id: string | null
  vehicle_id: string | null
}

export default async function ExecIntegrationsOutboxPage() {
  const [outboxRes, runsRes, webhooksRes] = await Promise.all([
    supabase
      .from("integrations_outbox")
      .select("id, entity_type, entity_id, target_system, event_type, status, attempts, next_run_at, created_at, last_error")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("kommo_import_runs")
      .select("id, status, leads_count, contacts_count, vehicles_count, started_at, finished_at, error")
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("kommo_webhook_events")
      .select("id, source_payload_id, status, kommo_status_id, kommo_status_label, created_at, error_message")
      .order("created_at", { ascending: false })
      .limit(25),
  ])

  if (outboxRes.error) console.error("Failed to fetch integrations_outbox", outboxRes.error)
  if (runsRes.error) console.error("Failed to fetch kommo_import_runs", runsRes.error)
  if (webhooksRes.error) console.error("Failed to fetch kommo_webhook_events", webhooksRes.error)

  const outboxJobs: OutboxDashboardJob[] = (outboxRes.data ?? []).map((job) => ({
    id: job.id,
    entityId: job.entity_id,
    entityType: job.entity_type,
    targetSystem: job.target_system,
    eventType: job.event_type,
    status: job.status,
    attempts: job.attempts ?? 0,
    nextRetry: job.next_run_at,
    createdAt: job.created_at,
    lastError: job.last_error ?? undefined,
  }))

  const kommoRuns: KommoImportRunRow[] = runsRes.data ?? []

  const rawWebhookEvents = webhooksRes.data ?? []
  const webhookEvents: typeof rawWebhookEvents = []
  const seenLeadKeys = new Set<string>()
  // Keep only the latest webhook per Kommo lead to avoid rendering identical rows.
  for (const event of rawWebhookEvents) {
    const key = event.source_payload_id ?? event.id
    if (key && seenLeadKeys.has(key)) continue
    if (key) seenLeadKeys.add(key)
    webhookEvents.push(event)
  }
  const payloadKeys = Array.from(
    new Set(
      webhookEvents
        .map((event) => event.source_payload_id)
        .filter((value): value is string => Boolean(value))
        .map((value) => (value.startsWith("kommo:") ? value : `kommo:${value}`))
    )
  )

  let bookingsLookup = new Map<string, BookingLookupValue>()
  const clientIds = new Set<string>()
  const vehicleIds = new Set<string>()

  if (payloadKeys.length > 0) {
    const bookingsRes = await supabase
      .from("bookings")
      .select("id, external_code, status, source_payload_id, client_id, vehicle_id")
      .in("source_payload_id", payloadKeys)

    if (bookingsRes.error) {
      console.error("Failed to fetch bookings for webhook events", bookingsRes.error)
    } else {
      bookingsLookup = new Map(
        (bookingsRes.data ?? [])
          .map((booking) => {
            const normalized = booking.source_payload_id?.replace(/^kommo:/, "") ?? null
            return normalized
              ? [
                  normalized,
                  {
                    id: booking.id,
                    external_code: booking.external_code ?? null,
                    status: booking.status ?? null,
                    client_id: booking.client_id ?? null,
                    vehicle_id: booking.vehicle_id ?? null,
                  },
                ]
              : null
          })
          .filter((entry): entry is [string, BookingLookupValue] => Boolean(entry))
      )
      ;(bookingsRes.data ?? []).forEach((booking) => {
        if (booking.client_id) clientIds.add(booking.client_id)
        if (booking.vehicle_id) vehicleIds.add(booking.vehicle_id)
      })
    }
  }

  let clientsLookup = new Map<string, { name: string | null }>()
  if (clientIds.size > 0) {
    const clientsRes = await supabase
      .from("clients")
      .select("id, name")
      .in("id", Array.from(clientIds))
    if (clientsRes.error) {
      console.error("Failed to fetch clients for webhook events", clientsRes.error)
    } else {
      clientsLookup = new Map((clientsRes.data ?? []).map((client) => [client.id, { name: client.name ?? null }]))
    }
  }

  let vehiclesLookup = new Map<string, { name: string | null; plate_number: string | null }>()
  if (vehicleIds.size > 0) {
    const vehiclesRes = await supabase
      .from("vehicles")
      .select("id, name, plate_number")
      .in("id", Array.from(vehicleIds))
    if (vehiclesRes.error) {
      console.error("Failed to fetch vehicles for webhook events", vehiclesRes.error)
    } else {
      vehiclesLookup = new Map(
        (vehiclesRes.data ?? []).map((vehicle) => [vehicle.id, { name: vehicle.name ?? null, plate_number: vehicle.plate_number ?? null }])
      )
    }
  }

  const kommoWebhookEvents: KommoWebhookEventRow[] = webhookEvents.map((event) => {
    const normalizedLeadId = event.source_payload_id?.replace(/^kommo:/, "") ?? event.source_payload_id ?? null
    const booking = normalizedLeadId ? bookingsLookup.get(normalizedLeadId) : undefined
    const client = booking?.client_id ? clientsLookup.get(booking.client_id) : undefined
    const vehicle = booking?.vehicle_id ? vehiclesLookup.get(booking.vehicle_id) : undefined

    return {
      id: event.id,
      status: event.status ?? "received",
      kommoStatusId: event.kommo_status_id ?? null,
      kommoStatusLabel: event.kommo_status_label ?? null,
      receivedAt: event.created_at ?? null,
      errorMessage: event.error_message ?? null,
      bookingId: booking?.id ?? null,
      bookingCode: booking?.external_code ?? null,
      bookingStatus: booking?.status ?? null,
      clientId: booking?.client_id ?? null,
      clientName: client?.name ?? null,
      vehicleId: booking?.vehicle_id ?? null,
      vehicleName: vehicle?.name ?? null,
      vehiclePlate: vehicle?.plate_number ?? null,
    }
  })

  return (
    <IntegrationsOutboxDashboard
      outboxJobs={outboxJobs}
      kommoRuns={kommoRuns}
      kommoWebhookEvents={kommoWebhookEvents}
    />
  )
}
