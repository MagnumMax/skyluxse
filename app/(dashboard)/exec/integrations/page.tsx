import {
  IntegrationsOutboxDashboard,
  type KommoImportRunRow,
  type OutboxDashboardJob,
  type KommoWebhookSummary,
} from "@/components/integrations-outbox-dashboard"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing Supabase credentials for integrations dashboard")
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

export default async function ExecIntegrationsOutboxPage() {
  const [outboxRes, runsRes, summaryRes, hourlyRes] = await Promise.all([
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
    supabase.rpc("kommo_webhook_summary").maybeSingle(),
    supabase.rpc("kommo_webhook_stats_view").maybeSingle(),
  ])

  if (outboxRes.error) console.error("Failed to fetch integrations_outbox", outboxRes.error)
  if (runsRes.error) console.error("Failed to fetch kommo_import_runs", runsRes.error)
  if (summaryRes.error) console.error("Failed to fetch kommo_webhook_summary", summaryRes.error)
  if (hourlyRes.error) console.error("Failed to fetch kommo_webhook_stats_view", hourlyRes.error)

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

  const summaryData = summaryRes.data as Partial<KommoWebhookSummary> | null
  const hourlyData = hourlyRes.data as {
    hour_total_events?: number
    hour_failed_events?: number
    hour_last_event_at?: string | null
  } | null

  const summary: KommoWebhookSummary = {
    last_event_at: summaryData?.last_event_at ?? null,
    events_today: summaryData?.events_today ?? 0,
    events_failed: summaryData?.events_failed ?? 0,
    last_status: summaryData?.last_status ?? null,
    last_status_id: summaryData?.last_status_id ?? null,
    last_status_label: summaryData?.last_status_label ?? null,
    hour_total_events: hourlyData?.hour_total_events ?? summaryData?.hour_total_events ?? 0,
    hour_failed_events: hourlyData?.hour_failed_events ?? summaryData?.hour_failed_events ?? 0,
    hour_last_event_at: hourlyData?.hour_last_event_at ?? summaryData?.hour_last_event_at ?? null,
  }

  return (
    <IntegrationsOutboxDashboard
      outboxJobs={outboxJobs}
      kommoRuns={kommoRuns}
      kommoWebhookSummary={summary}
    />
  )
}
