import type { Client, ClientDocument, ClientNotification, ClientPayment, ClientRental } from "@/lib/domain/entities"
import Link from "next/link"
import { ArrowUpRight, Bell, Car, CreditCard, FileText, Sparkles } from "lucide-react"

import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getClientSegmentLabel } from "@/lib/constants/client-segments"
import { cn } from "@/lib/utils"
import { ClientAiPanel } from "./sales-client-ai-panel"
import { ParameterList, type ParameterListItem } from "@/components/parameter-list"
import { ClientDocumentRecognitionPanel } from "./client-document-recognition-panel"

const AED_FORMATTER = new Intl.NumberFormat("en-CA", { style: "currency", currency: "AED", maximumFractionDigits: 0 })

export function SalesClientWorkspace({ client }: { client: Client }) {
  const sinceLabel = client.createdAt ? formatDateYear(client.createdAt) : "Unknown start"
  const outstandingLabel = formatCurrency(client.outstanding)
  const preferredChannels = client.preferences.notifications.length
    ? client.preferences.notifications.join(", ")
    : "Email"
  const segmentLabel = getClientSegmentLabel(client.segment)

  return (
    <DashboardPageShell>
      <ClientSummaryCard
        client={client}
        outstandingLabel={outstandingLabel}
        preferredChannels={preferredChannels}
        segmentLabel={segmentLabel}
        sinceLabel={sinceLabel}
      />

      <SectionCard title="Document Recognition" subtitle="Gemini parsed fields" icon={Sparkles}>
        <ClientDocumentRecognitionPanel
          recognition={client.documentRecognition}
          documents={client.documents}
          clientId={client.id}
        />
      </SectionCard>

      <section className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Rentals" subtitle="Latest bookings" icon={Car} className="lg:col-span-2">
          <RentalList rentals={client.rentals} compact />
        </SectionCard>

        <SectionCard title="Payments & notifications" subtitle="Cash flow and outreach trail" icon={CreditCard}>
          <PaymentPanel payments={client.payments} clientId={client.id} showViewAllLink />
          <div className="mt-5">
            <NotificationFeed notifications={client.notifications} />
          </div>
        </SectionCard>
      </section>

      <ClientAiPanel clientName={client.name} segment={segmentLabel} outstanding={client.outstanding} preferences={client.preferences} />
    </DashboardPageShell>
  )
}

function ClientSummaryCard({
  client,
  outstandingLabel,
  preferredChannels,
  segmentLabel,
  sinceLabel,
}: {
  client: Client
  outstandingLabel: string
  preferredChannels: string
  segmentLabel: string
  sinceLabel: string
}) {
  const subtitle = `${client.status} · ${segmentLabel} · Client since ${sinceLabel}`
  const overviewItems: ParameterListItem[] = [
    {
      label: "Outstanding balance",
      value: outstandingLabel,
      helper: client.outstanding > 0 ? "Requires attention" : "Settled",
      valueToneClassName: client.outstanding > 0 ? "text-rose-600" : undefined,
    },
    { label: "Phone", value: normalizeContactValue(client.phone, "Not provided") },
    { label: "Email", value: normalizeContactValue(client.email, "Not provided") },
    { label: "Gender", value: client.gender ?? "Not specified" },
    { label: "Nationality", value: client.residencyCountry ?? "Unknown" },
    { label: "Preferred channels", value: preferredChannels },
    { label: "Language", value: client.preferences.language?.toUpperCase() ?? "EN" },
    { label: "Timezone", value: client.preferences.timezone ?? "Asia/Dubai" },
    { label: "Last booking", value: client.lastBookingDate ? formatDateYear(client.lastBookingDate) : "No rentals" },
  ]

  return (
    <Card className="mb-6 rounded-[28px] border-border/70 bg-card/85">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">{client.name}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {client.kommoContactUrl ? (
            <Button asChild variant="outline" className="h-11 rounded-2xl px-4 font-semibold">
              <a href={client.kommoContactUrl} target="_blank" rel="noreferrer">
                Open in Kommo
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
          ) : null}
          <Button asChild className="h-11 rounded-2xl px-4 font-semibold">
            <Link href={{ pathname: "/bookings/new", query: { clientId: String(client.id) } }} prefetch={false}>
              Create Booking
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ParameterList items={overviewItems} columns={3} />
      </CardContent>
    </Card>
  )
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
  actions,
}: {
  title: string
  subtitle?: string
  icon?: typeof FileText
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  return (
    <article className={cn("rounded-[26px] border border-border/70 bg-background/95 p-5 shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">{title}</h2>
            {subtitle ? <p className="text-xs text-muted-foreground/80">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="text-xs font-semibold">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </article>
  )
}

export function DocumentList({
  documents,
  clientId,
  showViewAllLink = false,
  compact = false,
}: {
  documents: ClientDocument[]
  clientId?: string | number
  showViewAllLink?: boolean
  compact?: boolean
}) {
  if (!documents.length) {
    return (
      <EmptyState
        title="No documents uploaded yet"
        description="Request Emirates ID, licence, or passport before the next rental."
        actionLabel="Request documents"
      />
    )
  }

  return (
    <div>
      {!compact ? (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Documents</h3>
          {showViewAllLink && clientId ? (
            <Link
              href={`/clients/${clientId}/documents`}
              className="text-xs font-semibold text-primary hover:underline"
              prefetch={false}
            >
              View all
            </Link>
          ) : null}
        </div>
      ) : null}
      <ul className={cn("space-y-3 text-sm text-muted-foreground", compact ? "mt-0" : "mt-3")}
      >
        {documents.map((doc) => (
          <li key={doc.id} className="rounded-2xl border border-border/60 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{doc.name}</p>
                <p className="text-xs text-muted-foreground/80">{doc.type}</p>
              </div>
              <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
                {doc.status ?? "active"}
              </Badge>
            </div>
            {doc.expiry ? <p className="text-xs text-muted-foreground">Expires {formatDate(doc.expiry)}</p> : null}
            {doc.url ? (
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
              >
                View document
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function RentalList({ rentals, compact = false }: { rentals: ClientRental[]; compact?: boolean }) {
  if (!rentals.length) {
    return (
      <EmptyState
        icon={Car}
        title="No rentals yet"
        description="Create the first booking to kick off the dossier."
        actionLabel="Create booking"
        actionHref="/bookings/new"
      />
    )
  }

  return (
    <div>
      {!compact ? <h3 className="text-sm font-semibold text-foreground">Recent rentals</h3> : null}
      <ul className={cn("space-y-3 text-sm text-muted-foreground", compact ? "mt-0" : "mt-3")}>
        {rentals.map((rental) => (
          <li key={rental.bookingId} className="rounded-2xl border border-border/60 px-3 py-2">
            <p className="text-sm font-semibold text-foreground">{rental.carName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateRange(rental.startDate, rental.endDate)} · {formatCurrency(rental.totalAmount)}
            </p>
            <Link
              href={`/bookings/${String(rental.bookingId)}?view=operations`}
              className="text-xs font-semibold text-primary hover:underline"
              prefetch={false}
            >
              View booking #{rental.bookingCode ?? rental.bookingId}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PaymentPanel({
  payments,
  clientId,
  showViewAllLink = false,
}: {
  payments: ClientPayment[]
  clientId?: string | number
  showViewAllLink?: boolean
}) {
  if (!payments.length) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No payments recorded"
        description="Log invoices or collections to keep AR current."
        actionLabel="Send reminder"
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Payments</h3>
        {showViewAllLink && clientId ? (
          <Link
            href={`/clients/${clientId}/transactions`}
            className="text-xs font-semibold text-primary hover:underline"
            prefetch={false}
          >
            View all
          </Link>
        ) : null}
      </div>
      <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
        {payments.map((payment) => (
          <li key={payment.id} className="rounded-2xl border border-border/60 px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
              <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
                {payment.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {payment.type} via {payment.channel}
            </p>
            <p className="text-[11px] text-muted-foreground/80">{formatDateTime(payment.date)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function NotificationFeed({ notifications }: { notifications: ClientNotification[] }) {
  if (!notifications.length) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications sent"
        description="Send a welcome note or payment reminder to get started."
        actionLabel="Send message"
      />
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
      <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
        {notifications.map((notification) => (
          <li key={notification.id} className="rounded-2xl border border-border/60 px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">{notification.subject}</p>
              <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
                {notification.channel}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground/80">{formatDateTime(notification.date)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon?: typeof FileText
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border/80 p-5 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
        <p className="font-semibold text-foreground">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground/80">{description}</p>
      {actionLabel ? (
        actionHref ? (
          <Button asChild size="sm">
            <a href={actionHref}>{actionLabel}</a>
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            {actionLabel}
          </Button>
        )
      ) : null}
    </div>
  )
}

function formatCurrency(amount: number): string {
  return AED_FORMATTER.format(amount)
}

function formatDate(value?: string): string {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
}

function formatDateTime(value?: string): string {
  if (!value) return "Not recorded"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })
}

function formatDateRange(start?: string, end?: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`
}

function formatDateYear(value?: string): string {
  if (!value) return "Unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "short" })
}

function normalizeContactValue(value: string | undefined, fallback: string): string {
  if (!value || value === "—") return fallback
  return value
}

function formatDocType(value?: string) {
  if (!value) return "—"
  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}
