"use client"

import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const statusOptions = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
  { value: "completed", label: "Completed" },
  { value: "succeeded", label: "Succeeded" },
] as const

const zohoCredentialMeta = {
  status: "Connected",
  region: "EU",
  lastRotated: "28 Sep 2025 · 14:32 GST",
  expiresIn: "11 days",
  clientId: "1000.6J2X-OBFUSCATED",
  scopes: ["ZohoCRM.modules.ALL", "ZohoCRM.settings.ALL", "ZohoCRM.users.READ"],
  connectedBy: "Integration bot",
  featureFlag: "enableZohoLive",
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
})

const relativeFormatter = new Intl.RelativeTimeFormat("en-CA", { numeric: "auto" })

export type OutboxDashboardJob = {
  id: string
  entityId: string | null
  entityType: string | null
  targetSystem: string
  eventType: string
  status: string
  attempts: number
  nextRetry?: string | null
  createdAt?: string | null
  lastError?: string | null
}

export type KommoImportRunRow = {
  id: string
  status: string
  leads_count: number
  contacts_count: number
  vehicles_count: number
  started_at: string | null
  finished_at: string | null
  error: string | null
}

export type KommoWebhookSummary = {
  last_event_at: string | null
  events_today: number
  events_failed: number
  last_status: string | null
  last_status_id: string | null
  last_status_label: string | null
  hour_total_events: number
  hour_failed_events: number
  hour_last_event_at: string | null
}

type IntegrationsOutboxDashboardProps = {
  outboxJobs: OutboxDashboardJob[]
  kommoRuns: KommoImportRunRow[]
  kommoWebhookSummary: KommoWebhookSummary
}

export function IntegrationsOutboxDashboard({
  outboxJobs,
  kommoRuns,
  kommoWebhookSummary,
}: IntegrationsOutboxDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]["value"]>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRunId, setLastRunId] = useState<string | null>(kommoRuns[0]?.id ?? null)
  const { pushToast } = useToast()

  const summary: KommoWebhookSummary = kommoWebhookSummary ?? {
    last_event_at: null,
    events_today: 0,
    events_failed: 0,
    last_status: null,
    last_status_id: null,
    last_status_label: null,
    hour_total_events: 0,
    hour_failed_events: 0,
    hour_last_event_at: null,
  }

  const filteredJobs = useMemo(() => {
    return outboxJobs.filter((job) =>
      statusFilter === "all" ? true : job.status?.toLowerCase() === statusFilter
    )
  }, [outboxJobs, statusFilter])

  const stats = useMemo(() => {
    const total = outboxJobs.length
    const pending = outboxJobs.filter((job) => job.status?.toLowerCase() === "pending").length
    const failed = outboxJobs.filter((job) => job.status?.toLowerCase() === "failed").length
    const processing = outboxJobs.filter((job) => job.status?.toLowerCase() === "processing").length
    return { total, pending, failed, processing }
  }, [outboxJobs])

  const handleFilterChange = (value: (typeof statusOptions)[number]["value"]) => setStatusFilter(value)

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Kommo & Zoho operations"
        description="Kommo full-refresh runs, webhook intake, и Zoho outbox теперь отображаются в реальном времени на одной панели."
        meta={
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Live data
          </span>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Outbox jobs" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} tone="bg-amber-50 text-amber-700" />
        <StatCard label="Processing" value={stats.processing} tone="bg-indigo-50 text-indigo-700" />
        <StatCard label="Failed" value={stats.failed} tone="bg-rose-50 text-rose-700" />
      </section>

      <section className="rounded-[28px] border border-border/70 bg-card/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Kommo webhooks</p>
            <h2 className="text-2xl font-semibold tracking-tight">Live intake</h2>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/50">
                <td className="px-4 py-3 font-medium text-foreground">Last event</td>
                <td className="px-4 py-3">{formatDate(summary.last_event_at)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatRelative(summary.last_event_at)}</td>
              </tr>
              <tr className="border-t border-border/50">
                <td className="px-4 py-3 font-medium text-foreground">Last stage</td>
                <td className="px-4 py-3">{summary.last_status_label ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">Status: {summary.last_status ?? "processed"}</td>
              </tr>
              <tr className="border-t border-border/50">
                <td className="px-4 py-3 font-medium text-foreground">Events today</td>
                <td className="px-4 py-3">{summary.events_today}</td>
                <td className="px-4 py-3 text-muted-foreground">Failed: {summary.events_failed}</td>
              </tr>
              <tr className="border-t border-border/50">
                <td className="px-4 py-3 font-medium text-foreground">Last hour volume</td>
                <td className="px-4 py-3">{summary.hour_total_events}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Failed: {summary.hour_failed_events} · Updated {formatRelative(summary.hour_last_event_at)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-[26px] border border-border/70 bg-background/90 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Zoho connection</p>
              <p className="mt-1 text-lg font-semibold text-foreground">OAuth token & feature flag</p>
            </div>
            <StatusChip status={zohoCredentialMeta.status} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Region {zohoCredentialMeta.region} · Last rotation {zohoCredentialMeta.lastRotated} · Next rotation in {zohoCredentialMeta.expiresIn}.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="rounded-full border-border/60">
                  View credentials
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full max-w-md sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>Zoho OAuth credentials</SheetTitle>
                  <SheetDescription>Includes masked identifiers and the standard rotation checklist.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4 text-sm">
                  <DetailRow label="Client ID" value={zohoCredentialMeta.clientId} />
                  <DetailRow label="Scopes" value={zohoCredentialMeta.scopes.join(", ")} />
                  <DetailRow label="Connected by" value={zohoCredentialMeta.connectedBy} />
                  <DetailRow label="Feature flag" value={zohoCredentialMeta.featureFlag} />
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="ghost" className="rounded-full border border-border/60">
              Rotate token
            </Button>
          </div>
        </div>
        <div className="rounded-[26px] border border-border/70 bg-background/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Kommo API trigger</p>
          <p className="mt-2 text-lg font-semibold text-foreground">`POST /api/integrations/kommo/full-refresh`</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Use this endpoint to re-import Kommo data for 2025. Operator approval + Slack announcement required before triggering.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              disabled={isRefreshing}
              className="rounded-full"
              onClick={async () => {
                setIsRefreshing(true)
                try {
                  const res = await fetch("/api/integrations/kommo/full-refresh", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ year: 2025 }),
                  })
                  const payload = await res.json()
                  if (!res.ok) throw new Error(payload?.error ?? "Unknown error")
                  setLastRunId(payload.runId ?? null)
                  pushToast({
                    title: "Kommo import triggered",
                    description: `Run ${payload.runId} queued (${payload.leads ?? 0} leads). Refresh page to see status.`,
                    variant: "success",
                  })
                } catch (error) {
                  pushToast({
                    title: "Kommo import failed",
                    description: error instanceof Error ? error.message : "Unknown error",
                    variant: "destructive",
                  })
                } finally {
                  setIsRefreshing(false)
                }
              }}
            >
              {isRefreshing ? "Triggering…" : "Trigger import"}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                if (lastRunId) {
                  window.open(`/rest/v1/kommo_import_runs?id=eq.${lastRunId}`, "_blank")
                } else {
                  window.open("/docs/api", "_blank")
                }
              }}
            >
              {lastRunId ? "View latest run" : "API docs"}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-border/70 bg-card/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Kommo background syncs</p>
            <h2 className="text-2xl font-semibold tracking-tight">Full refresh runs</h2>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Run</th>
                <th className="px-4 py-2">Records</th>
                <th className="px-4 py-2">Started</th>
                <th className="px-4 py-2">Finished</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {kommoRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No Kommo runs yet.
                  </td>
                </tr>
              ) : (
                kommoRuns.map((run) => (
                  <tr key={run.id} className="border-t border-border/50">
                    <td className="px-4 py-3 font-mono text-xs">{run.id}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      Leads {run.leads_count} · Contacts {run.contacts_count} · Vehicles {run.vehicles_count}
                    </td>
                    <td className="px-4 py-3">{formatDate(run.started_at)}</td>
                    <td className="px-4 py-3">{formatDate(run.finished_at)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={run.status} />
                    </td>
                    <td className="px-4 py-3 text-rose-600 text-xs">{run.error ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[28px] border border-border/70 bg-card/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Zoho outbox jobs</p>
            <h2 className="text-2xl font-semibold tracking-tight">Replay & monitoring</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange(option.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition",
                  statusFilter === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">Target</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Attempts</th>
                <th className="px-4 py-2">Next retry</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.id} className="border-t border-border/40">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{job.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{job.entityType ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{job.entityId ?? "n/a"}</p>
                  </td>
                  <td className="px-4 py-3">{job.targetSystem}</td>
                  <td className="px-4 py-3">{job.eventType}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={job.status} />
                  </td>
                  <td className="px-4 py-3">{job.attempts}</td>
                  <td className="px-4 py-3">
                    <div>{formatDate(job.nextRetry)}</div>
                    <div className="text-xs text-muted-foreground">{formatRelative(job.nextRetry)}</div>
                  </td>
                  <td className="px-4 py-3">
                    {job.lastError ? (
                      <button className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary">
                        Replay
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredJobs.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No jobs match this filter.</p>
          ) : null}
        </div>
      </section>
    </DashboardPageShell>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className={cn("rounded-[24px] border border-border/70 bg-background/90 p-5 shadow-sm", tone)}>
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground">{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone = (() => {
    const normalized = status?.toLowerCase()
    switch (normalized) {
      case "failed":
        return "bg-rose-100 text-rose-700"
      case "pending":
        return "bg-amber-100 text-amber-700"
      case "processing":
      case "running":
        return "bg-indigo-100 text-indigo-700"
      case "needs_review":
        return "bg-amber-100 text-amber-800"
      case "completed":
      case "succeeded":
        return "bg-emerald-100 text-emerald-700"
      default:
        return "bg-muted text-muted-foreground"
    }
  })()
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", tone)}>{status}</span>
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "Connected"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-amber-100 text-amber-800 border-amber-200"
  return <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", tone)}>{status}</span>
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateFormatter.format(date)
}

function formatRelative(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const diffMs = date.getTime() - Date.now()
  const minutes = diffMs / (1000 * 60)
  if (Math.abs(minutes) > 1440) {
    return relativeFormatter.format(Math.round(minutes / 1440), "day")
  }
  if (Math.abs(minutes) > 60) {
    return relativeFormatter.format(Math.round(minutes / 60), "hour")
  }
  return relativeFormatter.format(Math.round(minutes), "minute")
}
