"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type { Client } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const statusOptions = ["VIP", "Gold", "Silver"]
const segmentOptions = ["Resident", "Tourist", "Business Traveller"]
const clientStatusTone: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-700",
  Gold: "bg-amber-100 text-amber-700",
  Silver: "bg-slate-100 text-slate-700",
}
const documentStatusTone: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-700",
  "needs-review": "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  expired: "bg-rose-100 text-rose-700",
}
const rentalStatusTone: Record<string, string> = {
  active: "bg-indigo-100 text-indigo-700",
  scheduled: "bg-amber-100 text-amber-700",
  completed: "bg-slate-100 text-slate-700",
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" })
const currencyFormatter = new Intl.NumberFormat("en-CA", { style: "currency", currency: "AED", maximumFractionDigits: 0 })
const numberFormatter = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 })

export function SalesClientsList({ clients }: { clients: Client[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [segmentFilter, setSegmentFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (statusFilter !== "all" && client.status !== statusFilter) return false
      if (segmentFilter !== "all" && client.segment !== segmentFilter) return false
      if (search.trim().length) {
        const haystack = `${client.name} ${client.email} ${client.phone}`.toLowerCase()
        if (!haystack.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [clients, search, segmentFilter, statusFilter])

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Client workspace" />

      <section className="rounded-[26px] border border-border/70 bg-card/80 p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="client-search">Search</Label>
            <Input
              id="client-search"
              placeholder="Search by name, email, phone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="segment-filter">Segment</Label>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger id="segment-filter">
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All segments</SelectItem>
                {segmentOptions.map((segment) => (
                  <SelectItem key={segment} value={segment}>
                    {segment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {filteredClients.length ? (
        <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card/80">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Engagement</th>
                <th className="px-6 py-4">Documents &amp; Rentals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredClients.map((client) => (
                <tr key={client.id} className="align-top">
                  <td className="px-6 py-5">
                    <ClientCell client={client} />
                  </td>
                  <td className="px-6 py-5">
                    <EngagementCell client={client} />
                  </td>
                  <td className="px-6 py-5">
                    <DocumentsActivityCell client={client} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="rounded-[24px] border border-border/60 bg-background/90 p-12 text-center">
          <p className="text-lg font-semibold text-foreground">Нет клиентов по выбранным фильтрам</p>
          <p className="mt-2 text-sm text-muted-foreground">Попробуйте сбросить фильтры или изменить поисковый запрос.</p>
        </section>
      )}
    </DashboardPageShell>
  )
}

function ClientCell({ client }: { client: Client }) {
  const statusClass = clientStatusTone[client.status] || "bg-muted text-muted-foreground"
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={toRoute(`/sales/clients/${client.id}`)} className="text-sm font-semibold text-primary hover:underline">
          {client.name}
        </Link>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusClass)}>{client.status}</span>
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {client.segment}
        </span>
        {client.residencyCountry ? (
          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {client.residencyCountry}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{client.phone}</span>
        <span>•</span>
        <span>{client.email}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={toRoute(`/sales/clients/${client.id}`)}
          className="rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
        >
          View workspace
        </Link>
        {client.outstanding > 0 ? (
          <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
            Outstanding {formatCurrency(client.outstanding)}
          </span>
        ) : (
          <span className="rounded-full border border-border/50 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            In good standing
          </span>
        )}
      </div>
    </div>
  )
}

function EngagementCell({ client }: { client: Client }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">Outstanding</p>
          <p className={cn("text-lg font-semibold", client.outstanding > 0 ? "text-rose-600" : "text-foreground")}>{formatCurrency(client.outstanding)}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            client.outstanding > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
          )}
        >
          {client.outstanding > 0 ? "Requires action" : "Settled"}
        </span>
      </div>
      <div className="grid gap-3 text-xs text-muted-foreground">
        <MetricRow label="Lifetime value" value={formatCurrency(client.lifetimeValue)} />
        <MetricRow label="Turnover" value={formatCurrency(client.turnover)} />
        <MetricRow label="NPS" value={numberFormatter.format(client.nps)} />
        <MetricRow label="Channels" value={client.preferences.notifications.join(", ")} />
      </div>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}

function DocumentsActivityCell({ client }: { client: Client }) {
  const highlightDocuments = client.documents.slice(0, 3)
  const rentals = [...client.rentals]
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 2)
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">Documents</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {highlightDocuments.map((doc) => (
            <span key={doc.id} className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", documentStatusTone[doc.status] || "bg-muted text-muted-foreground")}>
              {doc.name}
            </span>
          ))}
          {client.documents.length > highlightDocuments.length ? (
            <span className="text-[11px] font-semibold text-muted-foreground">
              +{client.documents.length - highlightDocuments.length} more
            </span>
          ) : null}
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">Recent rentals</p>
        {rentals.map((rental) => (
          <RentalRow key={rental.bookingId} rental={rental} />
        ))}
        {!rentals.length ? <p className="text-xs text-muted-foreground">No rentals recorded.</p> : null}
      </div>
    </div>
  )
}

function RentalRow({ rental }: { rental: Client["rentals"][number] }) {
  const statusClass = rentalStatusTone[rental.status] || "bg-muted text-muted-foreground"
  return (
    <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
      <div>
        <p className="text-sm font-semibold text-foreground">{rental.carName}</p>
        <p>
          {formatDateRange(rental.startDate, rental.endDate)} · {formatCurrency(rental.totalAmount)}
        </p>
      </div>
      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", statusClass)}>{rental.status}</span>
    </div>
  )
}

function toRoute(path: string) {
  return path as Parameters<typeof Link>[0]["href"]
}

function formatCurrency(value?: number) {
  if (!value && value !== 0) return "—"
  return currencyFormatter.format(value)
}

function formatDateRange(start?: string, end?: string) {
  if (!start && !end) return "—"
  try {
    if (start && end) {
      const startDate = new Date(start)
      const endDate = new Date(end)
      const formattedStart = dateFormatter.format(startDate)
      const formattedEnd = dateFormatter.format(endDate)
      if (formattedStart === formattedEnd) return formattedStart
      return `${formattedStart} – ${formattedEnd}`
    }
    if (start) return dateFormatter.format(new Date(start))
    if (end) return dateFormatter.format(new Date(end))
  } catch {
    return [start, end].filter(Boolean).join(" – ")
  }
  return "—"
}
