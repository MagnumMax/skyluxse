import type { ReactNode } from "react"
import Link from "next/link"

import type { Booking, Client, Driver } from "@/lib/domain/entities"
import { DEFAULT_VAT_RATE } from "@/lib/pricing/booking-totals"
import { getClientSegmentLabel } from "@/lib/constants/client-segments"
import { cn } from "@/lib/utils"
import { rateSalesService } from "@/app/actions/rate-sales-service"
import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { SalesServiceForm } from "@/components/sales-service-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClientAiPanel } from "@/components/sales-client-ai-panel"
import { ParameterList, type ParameterListItem } from "@/components/parameter-list"

const currencyFormatter = new Intl.NumberFormat("en-CA", { style: "currency", currency: "AED", maximumFractionDigits: 0 })
const dateFormatter = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" })
const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
const timeFormatter = new Intl.DateTimeFormat("en-CA", { hour: "2-digit", minute: "2-digit" })
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
  const advancePayment = resolveAdvancePayment(booking)
  const outstanding = computeOutstandingAmount(booking, advancePayment)
  const tags = booking.tags ?? []
  const statusTone = getStatusTone(booking.status)
  return (
    <DashboardPageShell>
      <BookingOverviewSection
        booking={booking}
        client={client}
        outstanding={outstanding}
        advancePayment={advancePayment}
        statusTone={statusTone}
        tags={tags}
      />

      <BookingLogisticsFinancialSection booking={booking} outstanding={outstanding} advancePayment={advancePayment} />

      <BookingActivitySection booking={booking} />

      <SalesServiceSection booking={booking} />

      <ExtensionsSection extensions={booking.extensions ?? []} />

      {variant === "sales" && client ? <SalesExtras booking={booking} client={client} /> : null}
      {variant === "exec" ? <ExecHighlights booking={booking} driver={driver} outstanding={outstanding} /> : null}
    </DashboardPageShell>
  )
}

function BookingOverviewSection({ booking, client, outstanding, advancePayment, statusTone, tags }: { booking: Booking; client?: Client; outstanding: number; advancePayment?: number | null; statusTone: string; tags: string[] }) {
  const stageLabel = booking.pipelineStageName ?? null
  const advanceInvoice = findAdvanceInvoice(booking)
  const depositInvoiceStatus = advanceInvoice?.status
  const clientHref = booking.clientId ? toRoute(`/clients/${booking.clientId}`) : undefined
  const detailRows: Array<{ label: string; value?: ReactNode; helper?: ReactNode }> = [
    {
      label: "Client",
      value:
        clientHref && booking.clientName ? (
          <Link href={clientHref} className="text-primary hover:underline">
            {booking.clientName}
          </Link>
        ) : (
          booking.clientName
        ),
      helper: client?.status,
    },
    stageLabel
      ? {
          label: "Stage",
          value: stageLabel,
        }
      : null,
    {
      label: "Channel",
      value: booking.channel,
    },
    {
      label: "Vehicle",
      value: booking.carName,
    },
    {
      label: "Total",
      value: currencyFormatter.format(booking.totalAmount),
      helper: `Outstanding ${currencyFormatter.format(outstanding)}`,
    },
    {
      label: "Advance payment",
      value: advancePayment != null ? currencyFormatter.format(advancePayment) : "—",
      helper: depositInvoiceStatus,
    },
  ].filter(Boolean) as Array<{ label: string; value?: ReactNode; helper?: ReactNode }>

  return (
    <Card className="space-y-6 rounded-[32px] border-border/70 bg-card/80">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={cn("px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]", getBookingStatusBadgeTone(booking.status, statusTone))}>
            {booking.status}
          </Badge>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{booking.code}</h1>
          {tags.length ? (
            <div className="flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-muted-foreground">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="border-border/60 px-2 py-0.5 text-[0.6rem] font-medium tracking-[0.25em]"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {detailRows.map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} helper={row.helper} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function BookingLogisticsFinancialSection({ booking, outstanding, advancePayment }: { booking: Booking; outstanding: number; advancePayment?: number | null }) {
  const totalWithVat = computeTotalWithVat(booking)
  const pickupDate = formatShortDate(booking.startDate, booking.startTime)
  const pickupTime = formatTimeLabel(booking.startDate, booking.startTime)
  const returnDate = formatShortDate(booking.endDate, booking.endTime)
  const returnTime = formatTimeLabel(booking.endDate, booking.endTime)
  const scheduleParameters: ParameterListItem[] = [
    {
      label: "Pickup",
      value: pickupDate ?? "—",
      helper: (
        <div className="space-y-0.5">
          {pickupTime ? <span>{pickupTime}</span> : null}
          <span>{booking.pickupLocation ?? "—"}</span>
        </div>
      ),
    },
    {
      label: "Return",
      value: returnDate ?? "—",
      helper: (
        <div className="space-y-0.5">
          {returnTime ? <span>{returnTime}</span> : null}
          <span>{booking.dropoffLocation ?? "—"}</span>
        </div>
      ),
    },
    {
      label: "Pickup mileage",
      value: formatMileage(booking.pickupMileage),
      helper: `Fuel ${booking.pickupFuel ?? "—"}`,
    },
    {
      label: "Return mileage",
      value: formatMileage(booking.returnMileage),
      helper: `Fuel ${booking.returnFuel ?? "—"}`,
    },
  ]
  const logisticsParameters: ParameterListItem[] = []
  const mapsLink = (location: string) => (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline-offset-4 hover:underline"
    >
      {location}
    </a>
  )
  if (booking.deliveryLocation) {
    logisticsParameters.push({ label: "Delivery location", value: mapsLink(booking.deliveryLocation) })
  }
  if (booking.collectLocation) {
    logisticsParameters.push({ label: "Collect location", value: mapsLink(booking.collectLocation) })
  }
  if (booking.deliveryFeeLabel) {
    logisticsParameters.push({ label: "Delivery fee", value: booking.deliveryFeeLabel })
  }
  if (typeof booking.fullInsuranceFee === "number" && booking.fullInsuranceFee > 0) {
    logisticsParameters.push({ label: "Full insurance fee", value: currencyFormatter.format(booking.fullInsuranceFee) })
  }
  if (booking.insuranceFeeLabel) {
    logisticsParameters.push({ label: "Deposit options", value: booking.insuranceFeeLabel })
  }
  if (booking.rentalDurationDays != null) {
    logisticsParameters.push({ label: "Duration", value: `${booking.rentalDurationDays} day${booking.rentalDurationDays === 1 ? "" : "s"}` })
  }
  if (booking.priceDaily != null) {
    logisticsParameters.push({ label: "Daily rate", value: currencyFormatter.format(booking.priceDaily) })
  }
  const financialParameters: ParameterListItem[] = [
    {
      label: "Total with VAT",
      value: currencyFormatter.format(totalWithVat ?? 0),
    },
    { label: "Advance payment", value: currencyFormatter.format((advancePayment ?? booking.deposit) ?? 0) },
    { label: "Paid", value: currencyFormatter.format(advancePayment ?? booking.paidAmount ?? 0) },
    { label: "Outstanding", value: currencyFormatter.format(outstanding) },
  ]
  const financialMeta: ParameterListItem[] = []
  if (booking.agreementNumber) {
    financialMeta.push({ label: "Agreement #", value: booking.agreementNumber })
  }
  if (booking.salesOrderUrl) {
    financialMeta.push({
      label: "Sales order",
      value: (
        <a href={booking.salesOrderUrl} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
          Open in Zoho
        </a>
      ),
      helper: booking.salesOrderUrl,
    })
  }
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-[26px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Schedule & logistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ParameterList items={scheduleParameters} columns={2} />
          {logisticsParameters.length ? <ParameterList items={logisticsParameters} columns={2} /> : null}
        </CardContent>
      </Card>
      <Card className="rounded-[26px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Financial summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ParameterList items={financialParameters} columns={2} />
          {financialMeta.length ? <ParameterList items={financialMeta} columns={2} /> : null}
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
  )
}

function BookingActivitySection({ booking }: { booking: Booking }) {
  return (
    <section className="grid gap-4">
      <HistoryCard title="History" entries={booking.history ?? []} />
    </section>
  )
}

function SalesServiceSection({ booking }: { booking: Booking }) {
  return (
    <section className="grid gap-4">
      <SalesServiceCard booking={booking} />
    </section>
  )
}

function DetailRow({ label, value, helper }: { label: string; value?: ReactNode; helper?: ReactNode }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground">{value ?? "—"}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}

function resolveAdvancePayment(booking: Booking) {
  if (booking.advancePayment != null && booking.advancePayment > 0) {
    return booking.advancePayment
  }
  const deposit = booking.deposit ?? null
  if (deposit && deposit > 0) {
    return deposit
  }
  const invoice = findAdvanceInvoice(booking)
  return invoice && typeof invoice.amount === "number" ? invoice.amount : null
}

function findAdvanceInvoice(booking: Booking) {
  const invoices = booking.invoices ?? []
  return invoices.find((invoice) => {
    const label = invoice.label?.toLowerCase() ?? ""
    const scope = invoice.scope?.toLowerCase() ?? ""
    return label.includes("deposit") || label.includes("advance") || scope.includes("deposit") || scope.includes("advance")
  })
}

function computeOutstandingAmount(booking: Booking, advanceOverride?: number | null) {
  const advance = advanceOverride ?? resolveAdvancePayment(booking) ?? 0
  const totalWithVat = computeTotalWithVat(booking) ?? booking.totalAmount ?? 0
  const outstanding = totalWithVat - advance
  return outstanding > 0 ? outstanding : 0
}

function HistoryCard({ title, entries }: { title: string; entries: NonNullable<Booking["history"]> }) {
  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">{title}</CardTitle>
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
  const rating = booking.salesService?.rating
  const feedback = booking.salesService?.feedback
  const ratedAt = booking.salesService?.ratedAt ? formatDateTime(booking.salesService.ratedAt) : undefined
  const ratedBy = booking.salesService?.ratedBy
  const hasRating = typeof rating === "number" && !Number.isNaN(rating)
  const ratingDisplay = hasRating ? `${rating}/10` : "—"
  const ratingMetaParts = []
  if (ratedAt) ratingMetaParts.push(`Updated ${ratedAt}`)
  if (ratedBy) ratingMetaParts.push(ratedBy.toUpperCase())
  const ratingMeta = ratingMetaParts.length ? ratingMetaParts.join(" · ") : undefined
  const bookingId = String(booking.id)

  return (
    <Card className="rounded-[24px] border-border/70 bg-card/80">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Sales service score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-5 text-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="text-3xl font-semibold text-foreground">{ratingDisplay}</p>
          {ratingMeta ? <p className="text-xs text-muted-foreground">{ratingMeta}</p> : null}
        </div>
        {feedback ? (
          <p className="rounded-2xl border border-border/60 bg-background/80 p-3 text-sm text-foreground">{feedback}</p>
        ) : null}
        <SalesServiceForm
          action={rateSalesService}
          bookingId={bookingId}
          initialRating={rating ?? undefined}
          initialFeedback={booking.salesService?.feedback}
        />
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
              <p className="text-xs text-muted-foreground">
                {extension.startDate} {extension.startTime} → {extension.endDate} {extension.endTime}
              </p>
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
  const segmentLabel = getClientSegmentLabel(client.segment)
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <ClientAiPanel
        clientName={client.name}
        segment={segmentLabel}
        outstanding={client.outstanding}
        preferences={client.preferences}
      />
      <Card className="rounded-[26px] border-dashed border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Conflict signals</CardTitle>
          <p className="text-xs text-muted-foreground">Alerts for overdue SLAs, balances, and extension clashes.</p>
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
  const items: ParameterListItem[] = [
    {
      label: "Outstanding",
      value: currencyFormatter.format(outstanding),
      helper: outstanding > 0 ? "Collect before release" : "Settled",
      valueToneClassName: outstanding > 0 ? "text-rose-600" : "text-emerald-600",
    },
    {
      label: "SLA status",
      value: slaStatus.label,
      helper: slaStatus.helper,
      valueToneClassName: slaStatus.tone,
    },
    { label: "Driver", value: driver?.name ?? "Unassigned", helper: driver?.status ?? "" },
  ]
  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Exec highlights</CardTitle>
      </CardHeader>
      <CardContent>
        <ParameterList items={items} columns={3} valueSize="lg" />
      </CardContent>
    </Card>
  )
}

function computeTotalWithVat(booking: Booking) {
  const billing = booking.billing
  if (!billing) {
    return booking.totalAmount
  }
  const base = billing.base ?? 0
  const addons = billing.addons ?? 0
  const fees = billing.fees ?? 0
  const discounts = billing.discounts ?? 0
  const subtotal = base + addons + fees - discounts
  if (subtotal <= 0) {
    return booking.totalAmount
  }
  const vatRate = typeof billing.vatRate === "number" ? billing.vatRate : DEFAULT_VAT_RATE
  return subtotal * (1 + vatRate)
}

function formatMileage(value?: number | null) {
  if (value == null) return "—"
  return `${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(value)} km`
}

function formatShortDate(date?: string, time?: string) {
  const parsed = parseScheduleDate(date, time)
  if (parsed) return dateFormatter.format(parsed)
  return date?.split("T")[0] ?? null
}

function formatTimeLabel(date?: string, time?: string) {
  if (time && !time.includes("T")) return time
  const parsed = parseScheduleDate(date, time)
  if (parsed) return timeFormatter.format(parsed)
  return time ?? null
}

function parseScheduleDate(date?: string, time?: string) {
  if (!date) return null
  const candidates = new Set<string>()
  const normalizedTime = time ? (time.length === 5 ? `${time}:00` : time) : null
  if (time && !date.includes("T")) {
    candidates.add(`${date}T${normalizedTime}`)
    candidates.add(`${date}T${normalizedTime}Z`)
  }
  candidates.add(date)
  if (!date.includes("T")) {
    candidates.add(`${date}T00:00:00`)
    candidates.add(`${date}T00:00:00Z`)
  }
  for (const value of candidates) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  return null
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

/**
 * Маппинг статус-бейджа бронирования к цветам Badge.
 * Сохраняет визуальный тон через className, но использует shadcn Badge.
 */
function getBookingStatusBadgeTone(status: Booking["status"], fallbackToneClass: string) {
  if (status === "in-rent") return "bg-indigo-100 text-indigo-700 border-indigo-200"
  if (status === "delivery") return "bg-blue-100 text-blue-700 border-blue-200"
  if (status === "settlement") return "bg-emerald-100 text-emerald-700 border-emerald-200"
  if (status === "preparation") return "bg-violet-100 text-violet-700 border-violet-200"
  // fallback: переиспользуем старый класс, чтобы не ломать тональность
  return fallbackToneClass
}

function toRoute(href: string) {
  return href as Parameters<typeof Link>[0]["href"]
}

function getConflictSignals(booking: Booking) {
  const signals: { label: string; detail: string }[] = []
  const outstanding = computeOutstandingAmount(booking)
  if (outstanding > 0) {
    signals.push({ label: "Outstanding balance", detail: `Collect ${currencyFormatter.format(outstanding)} before release.` })
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
