import Image from "next/image"
import Link from "next/link"

import type { Booking, Client, Driver } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"
import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientAiPanel } from "@/components/sales-client-ai-panel"

const currencyFormatter = new Intl.NumberFormat("en-CA", { style: "currency", currency: "AED", maximumFractionDigits: 0 })
const dateFormatter = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" })
const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
const referenceDate = new Date("2025-10-13T08:00:00Z")

export function OperationsBookingDetail({
  booking,
  client,
  driver,
  variant = "operations",
}: {
  booking: Booking
  client?: Client
  driver?: Driver | null
  variant?: "operations" | "sales" | "exec"
}) {
  const outstanding = Math.max((booking.totalAmount ?? 0) - (booking.paidAmount ?? 0), 0)
  const deposit = booking.deposit ?? 0
  const tags = booking.tags ?? []
  const statusTone = getStatusTone(booking.status)
  const priorityTone = getPriorityTone(booking.priority)
  const locationChips = [booking.pickupLocation, booking.dropoffLocation].filter(Boolean)

  return (
    <DashboardPageShell>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusTone)}>{booking.status}</span>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", priorityTone)}>{booking.priority}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{booking.code}</h1>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{booking.type?.toUpperCase()}</span>
            <span>Channel {booking.channel}</span>
            <span>Segment {booking.segment}</span>
          </div>
        </div>
        {tags.length ? (
          <div className="flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-muted-foreground">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full border border-border/60 px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat label="Client" value={booking.clientName} helper={client?.status} />
        <Stat label="Total" value={currencyFormatter.format(booking.totalAmount)} helper={`Outstanding ${currencyFormatter.format(outstanding)}`} />
        <Stat label="Deposit" value={currencyFormatter.format(deposit)} helper={booking.invoices?.find((inv) => inv.label?.toLowerCase().includes("deposit"))?.status} />
        <Stat label="Driver" value={driver?.name ?? "Unassigned"} helper={driver?.status} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Schedule & logistics</CardTitle>
            <CardDescription>Pickup and return timeline overview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <ScheduleItem label="Pickup" date={booking.startDate} time={booking.startTime} location={booking.pickupLocation} />
              <ScheduleItem label="Return" date={booking.endDate} time={booking.endTime} location={booking.dropoffLocation} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ScheduleStat label="Pickup mileage" value={formatMileage(booking.pickupMileage)} helper={`Fuel ${booking.pickupFuel ?? "—"}`} />
              <ScheduleStat label="Return mileage" value={formatMileage(booking.returnMileage)} helper={`Fuel ${booking.returnFuel ?? "—"}`} />
            </div>
            {locationChips.length ? (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {locationChips.map((loc) => (
                  <a key={loc} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc!)}`} target="_blank" rel="noreferrer" className="rounded-full border border-border/60 px-3 py-1 hover:text-primary">
                    {loc}
                  </a>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Financial summary</CardTitle>
            <CardDescription>Totals, billing breakdown, outstanding balance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <AmountPill label="Total" amount={booking.totalAmount} accent="text-emerald-600" />
              <AmountPill label="Paid" amount={booking.paidAmount} accent="text-primary" />
              <AmountPill label="Outstanding" amount={outstanding} accent="text-rose-600" />
            </div>
            {booking.billing ? (
              <div className="rounded-2xl border border-border/60 bg-background/80 p-3 text-xs text-muted-foreground">
                <p>Base {currencyFormatter.format(booking.billing.base)}</p>
                <p>Add-ons {currencyFormatter.format(booking.billing.addons)}</p>
                <p>Discounts {currencyFormatter.format(booking.billing.discounts)}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Invoices</p>
              <ul className="mt-2 space-y-2 text-sm">
                {(booking.invoices ?? []).length === 0 ? (
                  <li className="text-muted-foreground">No invoices yet</li>
                ) : (
                  booking.invoices!.map((invoice) => (
                    <li key={invoice.id} className="rounded-2xl border border-border/60 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{invoice.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.issuedDate} · Due {invoice.dueDate ?? "—"}
                          </p>
                        </div>
                        <span className="text-base font-semibold text-foreground">{currencyFormatter.format(invoice.amount)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Status: {invoice.status}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TimelineCard title="Timeline" description="Latest operational updates" entries={booking.timeline ?? []} />
        <HistoryCard title="History" entries={booking.history ?? []} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Documents</CardTitle>
            <CardDescription>Contract, deposit, addenda.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(booking.documents ?? []).length === 0 ? (
                <li className="text-muted-foreground">No documents uploaded</li>
              ) : (
                booking.documents!.map((doc, idx) => {
                  const url = doc.url ? doc.url.replace(/^\/public/, "") : undefined
                  return (
                    <li key={`${doc.type}-${idx}`} className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-2">
                      <div>
                        <p className="font-semibold text-foreground">{doc.name ?? doc.type}</p>
                        <p className="text-xs text-muted-foreground">Type {doc.type}</p>
                      </div>
                      <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", documentTone(doc.status))}>{doc.status}</span>
                      {url ? (
                        <Image src={url} alt={doc.name ?? doc.type} width={120} height={80} className="ml-3 hidden h-16 w-24 rounded object-cover sm:block" />
                      ) : null}
                    </li>
                  )
                })
              )}
            </ul>
          </CardContent>
        </Card>
        <SalesServiceCard booking={booking} />
      </section>

      <ExtensionsSection extensions={booking.extensions ?? []} />

      {variant === "sales" && client ? <SalesExtras booking={booking} client={client} /> : null}
      {variant === "exec" ? <ExecHighlights booking={booking} driver={driver} outstanding={outstanding} /> : null}
    </DashboardPageShell>
  )
}

function Stat({ label, value, helper }: { label: string; value?: string | number; helper?: string | null }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4 text-sm">
      <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground">{value ?? "—"}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}

function ScheduleItem({ label, date, time, location }: { label: string; date?: string; time?: string; location?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
      <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{formatDateLabel(date, time)}</p>
      <p className="text-xs text-muted-foreground">{location ?? "—"}</p>
    </div>
  )
}

function ScheduleStat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
      <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}

function AmountPill({ label, amount, accent }: { label: string; amount?: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-3 text-center">
      <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold text-foreground", accent)}>{currencyFormatter.format(amount ?? 0)}</p>
    </div>
  )
}

function TimelineCard({ title, description, entries }: { title: string; description?: string; entries: NonNullable<Booking["timeline"]> }) {
  const sorted = [...entries].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {sorted.length === 0 ? (
            <li className="text-muted-foreground">No entries yet</li>
          ) : (
            sorted.map((item, idx) => (
              <li key={`${item.ts}-${idx}`} className="rounded-2xl border border-border/60 px-3 py-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{item.status}</span>
                  <span>{formatDateTime(item.ts)}</span>
                </div>
                <p className="text-sm text-foreground">{item.note}</p>
                <p className="text-xs text-muted-foreground">Actor: {item.actor}</p>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}

function HistoryCard({ title, entries }: { title: string; entries: NonNullable<Booking["history"]> }) {
  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">{title}</CardTitle>
        <CardDescription>Events logged in Kommo + ERP.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {entries.length === 0 ? (
            <li className="text-muted-foreground">No history</li>
          ) : (
            entries.map((entry, idx) => (
              <li key={`${entry.ts}-${idx}`} className="rounded-2xl border border-border/60 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{entry.ts}</p>
                <p className="text-sm text-foreground">{entry.event}</p>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}

function SalesServiceCard({ booking }: { booking: Booking }) {
  const rating = booking.salesService?.rating ?? 8
  const feedback = booking.salesService?.feedback ?? "Awaiting feedback"
  const ratedAt = booking.salesService?.ratedAt ? formatDateTime(booking.salesService.ratedAt) : "—"
  const ratedBy = booking.salesService?.ratedBy ?? "ceo"

  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Sales service score</CardTitle>
        <CardDescription>Read-only view on the operations route.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-4xl font-semibold text-foreground">{rating}/10</p>
        <p className="text-xs text-muted-foreground">Updated {ratedAt} by {ratedBy.toUpperCase()}</p>
        <p className="rounded-2xl border border-border/60 bg-background/70 p-3 text-sm text-foreground">{feedback}</p>
      </CardContent>
    </Card>
  )
}

function ExtensionsSection({ extensions }: { extensions: NonNullable<Booking["extensions"]> }) {
  if (!extensions.length) return null
  return (
    <section className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Extensions</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {extensions.map((extension) => (
          <Card key={extension.id} className="rounded-[26px] border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">{extension.label}</CardTitle>
              <CardDescription>
                {extension.startDate} {extension.startTime} → {extension.endDate} {extension.endTime}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Status {extension.status}</p>
              {extension.note ? <p className="text-sm text-muted-foreground">{extension.note}</p> : null}
              {extension.pricing ? (
                <div className="rounded-2xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
                  <p>Base {currencyFormatter.format(extension.pricing.base)}</p>
                  <p>Add-ons {currencyFormatter.format(extension.pricing.addons)}</p>
                  <p>Total {currencyFormatter.format(extension.pricing.total ?? extension.pricing.base + extension.pricing.addons)}</p>
                </div>
              ) : null}
              {extension.tasks && extension.tasks.length ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Tasks</p>
                  <ul className="mt-2 space-y-1">
                    {extension.tasks.map((task) => (
                      <li key={task.id} className="rounded-xl border border-border/60 px-2 py-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{task.title}</span> — {task.status}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function SalesExtras({ booking, client }: { booking: Booking; client: Client }) {
  const conflicts = getConflictSignals(booking)
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <ClientAiPanel
        clientName={client.name}
        segment={client.segment}
        outstanding={client.outstanding}
        preferences={client.preferences}
      />
      <Card className="rounded-[26px] border-dashed border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Conflict signals</CardTitle>
          <CardDescription>Alerts for overdue SLAs, balances, and extension clashes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {conflicts.length === 0 ? (
              <li className="text-muted-foreground">No blocking signals</li>
            ) : (
              conflicts.map((signal) => (
                <li key={signal.label} className="rounded-2xl border border-border/70 px-3 py-2">
                  <p className="font-semibold text-foreground">{signal.label}</p>
                  <p className="text-xs text-muted-foreground">{signal.detail}</p>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}

function ExecHighlights({ booking, driver, outstanding }: { booking: Booking; driver?: Driver | null; outstanding: number }) {
  const slaStatus = getSlaStatus(booking)
  const cards = [
    { label: "Outstanding", value: currencyFormatter.format(outstanding), helper: outstanding > 0 ? "Collect before release" : "Settled", tone: outstanding > 0 ? "text-rose-600" : "text-emerald-600" },
    { label: "SLA status", value: slaStatus.label, helper: slaStatus.helper, tone: slaStatus.tone },
    { label: "Driver", value: driver?.name ?? "Unassigned", helper: driver?.status ?? "" },
  ]
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="rounded-[24px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-semibold text-foreground", card.tone)}>{card.value}</p>
            {card.helper ? <p className="text-xs text-muted-foreground">{card.helper}</p> : null}
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

function formatMileage(value?: number | null) {
  if (value == null) return "—"
  return `${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(value)} km`
}

function formatDateLabel(date?: string, time?: string) {
  if (!date) return "—"
  try {
    const iso = time ? `${date}T${time}:00Z` : `${date}T00:00:00Z`
    return dateTimeFormatter.format(new Date(iso))
  } catch {
    return `${date} ${time ?? ""}`.trim()
  }
}

function formatDateTime(value?: string) {
  if (!value) return "—"
  try {
    return dateTimeFormatter.format(new Date(value))
  } catch {
    return value
  }
}

function getStatusTone(status: Booking["status"]) {
  if (status === "in-rent") return "bg-indigo-100 text-indigo-700"
  if (status === "delivery") return "bg-blue-100 text-blue-700"
  if (status === "settlement") return "bg-emerald-100 text-emerald-700"
  if (status === "preparation") return "bg-violet-100 text-violet-700"
  return "bg-slate-100 text-slate-700"
}

function getPriorityTone(priority: Booking["priority"]) {
  if (priority === "high") return "bg-rose-100 text-rose-700"
  if (priority === "medium") return "bg-amber-100 text-amber-700"
  return "bg-emerald-100 text-emerald-700"
}

function documentTone(status?: string) {
  if (!status) return "bg-slate-100 text-slate-700"
  const normalized = status.toLowerCase()
  if (normalized.includes("pending") || normalized.includes("warning")) return "bg-amber-100 text-amber-700"
  if (normalized.includes("authorized") || normalized.includes("signed") || normalized.includes("active")) return "bg-emerald-100 text-emerald-700"
  return "bg-slate-100 text-slate-700"
}

function toRoute(href: string) {
  return href as Parameters<typeof Link>[0]["href"]
}

function getConflictSignals(booking: Booking) {
  const signals: { label: string; detail: string }[] = []
  const outstanding = Math.max((booking.totalAmount ?? 0) - (booking.paidAmount ?? 0), 0)
  if (outstanding > 0) {
    signals.push({ label: "Outstanding balance", detail: `Collect AED ${outstanding.toLocaleString()} before release.` })
  }
  if (booking.targetTime && booking.status !== "in-rent") {
    const diff = booking.targetTime - referenceDate.getTime()
    if (diff < 0) {
      signals.push({ label: "SLA breach", detail: "Target time passed — coordinate with operations." })
    } else if (diff < 2 * 60 * 60 * 1000) {
      signals.push({ label: "SLA risk", detail: "Under 2h to promised time; confirm driver readiness." })
    }
  }
  if (booking.tags?.some((tag) => tag.includes("extension"))) {
    signals.push({ label: "Extension pending", detail: "Client expects extension confirmation — update pricing." })
  }
  return signals
}

function getSlaStatus(booking: Booking) {
  if (!booking.targetTime) {
    return { label: "Not tracked", helper: "No promised time", tone: "text-muted-foreground" }
  }
  const diff = booking.targetTime - referenceDate.getTime()
  if (diff < 0) {
    return { label: "Breached", helper: "Promised window passed", tone: "text-rose-600" }
  }
  if (diff < 2 * 60 * 60 * 1000) {
    return { label: "At risk", helper: "Under 2h remaining", tone: "text-amber-600" }
  }
  return { label: "On track", helper: ">2h to promised time", tone: "text-emerald-600" }
}
