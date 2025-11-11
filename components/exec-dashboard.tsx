import Link from "next/link"

import type { Booking } from "@/lib/domain/entities"
import { getExecDashboardMetrics } from "@/lib/data/analytics"
import { getLiveBookings, getLiveDrivers } from "@/lib/data/live-data"
import { cn } from "@/lib/utils"
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const trackedStatuses = ["new", "preparation", "delivery"]
const currencyFormatter = new Intl.NumberFormat("en-CA", { style: "currency", currency: "AED", maximumFractionDigits: 0 })
const dateFormatter = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" })

const slaCards = [
  {
    key: "overdue" as const,
    label: "Overdue",
    description: "Requires immediate action",
    surface: "border border-destructive/40 bg-destructive/10",
    accent: "text-destructive",
  },
  {
    key: "atRisk" as const,
    label: "SLA risk",
    description: "Check within next 3h",
    surface: "border border-amber-200 bg-amber-50/80",
    accent: "text-amber-600",
  },
  {
    key: "onTrack" as const,
    label: "On track",
    description: "Milestones are on schedule",
    surface: "border border-emerald-200 bg-emerald-50/80",
    accent: "text-emerald-600",
  },
]

export async function ExecDashboard() {
  const [bookings, drivers, metrics] = await Promise.all([
    getLiveBookings(),
    getLiveDrivers(),
    getExecDashboardMetrics(),
  ])
  const { kpis, revenueTrend, driverPerformance } = metrics
  const slaBuckets = buildSlaBuckets(bookings)

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Command centre" />

      <section className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Fleet utilisation" value={formatPercent(kpis.fleetUtilization)} helper="Target ≥ 90%" trend="+4% WoW" />
        <KpiCard label="SLA met" value={formatPercent(kpis.slaCompliance)} helper="Threshold ≥ 85%" trend="+2% WoW" />
        <KpiCard label="Active bookings" value={kpis.activeBookings.toString()} helper="Monitored by fleet team" trend={'+3 per day'} />
        <KpiCard label="Client NPS" value={kpis.clientNps.toString()} helper="Target ≥ 70" trend={'+1 pt'} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {slaCards.map((card) => {
          const bucket = slaBuckets[card.key]
          const sample = bucket.items.slice(0, 2)
          return (
            <Card key={card.key} className={cn("rounded-[24px] p-5", card.surface)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-sm font-semibold", card.accent)}>{card.label}</p>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </div>
                <p className="text-2xl font-semibold text-foreground">{bucket.items.length}</p>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {sample.length === 0 ? <li>No bookings in this group</li> : sample.map((booking) => <li key={booking.id}>#{booking.id} · {booking.carName}</li>)}
              </ul>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
            <CardTitle className="text-lg font-semibold text-foreground">Revenue vs expenses</CardTitle>
            <CardDescription>7-day revenue and expense trendline.</CardDescription>
            </div>
            <Link href={toRoute("/exec/analytics")} className="text-xs font-semibold text-muted-foreground hover:text-primary">
              View analytics →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {revenueTrend.map((point) => (
                <div key={point.date} className="rounded-2xl border border-border/60 px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatShortDate(point.date)}</span>
                    <span>{point.bookings} bookings</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(point.revenue)}</p>
                    <p className="text-xs text-muted-foreground">Expenses {formatCurrency(point.expenses)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Driver performance</CardTitle>
            <CardDescription>Completion rate versus NPS snapshot.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {driverPerformance.map((entry) => {
                const driver = drivers.find((item) => String(item.id) === String(entry.driverId))
                return (
                  <div key={entry.driverId} className="rounded-2xl border border-border/60 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{driver?.name ?? `Driver ${entry.driverId}`}</p>
                      <span className="text-xs text-muted-foreground">{driver?.status}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <span>Completion {formatPercent(entry.completionRate)}</span>
                      <span>NPS {(entry.nps * 20).toFixed(0)} / 100</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>
    </DashboardPageShell>
  )
}

function KpiCard({ label, value, helper, trend }: { label: string; value: string; helper?: string; trend?: string }) {
  const tone = trend?.startsWith("+") ? "text-emerald-600" : trend?.startsWith("-") ? "text-rose-600" : "text-muted-foreground"
  return (
    <Card className="rounded-[24px] border-border/70 bg-card/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
      {helper ? <p className="text-sm text-muted-foreground">{helper}</p> : null}
      {trend ? <p className={cn("mt-3 text-xs", tone)}>{trend}</p> : null}
    </Card>
  )
}

function buildSlaBuckets(bookings: Booking[]) {
  const buckets: Record<"overdue" | "atRisk" | "onTrack", { items: Booking[] }> = {
    overdue: { items: [] },
    atRisk: { items: [] },
    onTrack: { items: [] },
  }
  const now = Date.now()
  bookings.forEach((booking) => {
    if (!trackedStatuses.includes(booking.status) || !booking.targetTime) return
    const diff = booking.targetTime - now
    if (diff < 0) {
      buckets.overdue.items.push(booking)
    } else if (diff <= 3 * 60 * 60 * 1000) {
      buckets.atRisk.items.push(booking)
    } else {
      buckets.onTrack.items.push(booking)
    }
  })
  return buckets
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatCurrency(value?: number) {
  return currencyFormatter.format(value ?? 0)
}

function formatShortDate(value: string) {
  try {
    return dateFormatter.format(new Date(value))
  } catch {
    return value
  }
}

function toRoute(href: string) {
  return href as Parameters<typeof Link>[0]["href"]
}
