"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import type { Client } from "@/lib/domain/entities"
import { clientSegmentFilterOptions, clientSegmentLabels, getClientSegmentLabel } from "@/lib/constants/client-segments"
import { cn } from "@/lib/utils"
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { DashboardHeaderSearch } from "@/components/dashboard-header-search"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const statusFilterOptions = [
  { value: "VIP", label: "VIP" },
  { value: "Gold", label: "Gold" },
  { value: "Silver", label: "Silver" },
]
const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest" },
  { value: "lifetimeValue", label: "Lifetime value" },
  { value: "lastBooking", label: "Last booking" },
]
const clientStatusTone: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-700",
  Gold: "bg-amber-100 text-amber-700",
  Silver: "bg-slate-100 text-slate-700",
}
const rentalStatusTone: Record<string, string> = {
  active: "bg-indigo-100 text-indigo-700",
  scheduled: "bg-amber-100 text-amber-700",
  completed: "bg-slate-100 text-slate-700",
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" })
const currencyFormatter = new Intl.NumberFormat("en-CA", { style: "currency", currency: "AED", maximumFractionDigits: 0 })
const numberFormatter = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 })
const percentFormatter = new Intl.NumberFormat("en-CA", { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 0 })

type FilterOption = { value: string; label: string }

type FilterState = {
  search: string
  status: string
  segment: string
}

type SortOption = (typeof SORT_OPTIONS)[number]["value"]
type SortDirection = "asc" | "desc"

const DEFAULT_FILTERS: FilterState = {
  search: "",
  status: "all",
  segment: "all",
}

export function SalesClientsList({ clients }: { clients: Client[] }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState<SortOption>("createdAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [referenceTimestamp] = useState(() => Date.now())

  const kpis = useMemo(() => {
    const totalClients = clients.length
    const totalOutstanding = clients.reduce((sum, client) => sum + (client.outstanding ?? 0), 0)
    const totalLtv = clients.reduce((sum, client) => sum + (client.lifetimeValue ?? 0), 0)
    const avgLtv = totalClients ? totalLtv / totalClients : 0
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
    const activeRecently = clients.filter((client) => {
      if (!client.lastBookingDate) return false
      const ts = Date.parse(client.lastBookingDate)
      if (Number.isNaN(ts)) return false
      return referenceTimestamp - ts <= THIRTY_DAYS
    }).length
    const vipShare = totalClients
      ? percentFormatter.format(clients.filter((client) => client.status === "VIP").length / totalClients)
      : percentFormatter.format(0)
    const goldShare = totalClients
      ? percentFormatter.format(clients.filter((client) => client.status === "Gold").length / totalClients)
      : percentFormatter.format(0)

    return {
      totalClients: numberFormatter.format(totalClients),
      activeRecently: `${numberFormatter.format(activeRecently)} / ${totalClients || 0}`,
      totalOutstanding: currencyFormatter.format(totalOutstanding),
      avgLtv: currencyFormatter.format(avgLtv),
      vipShare,
      goldShare,
    }
  }, [clients, referenceTimestamp])

  const filteredClients = useMemo(() => {
    const list = clients.filter((client) => {
      const segmentKey = client.segment ?? "general"
      if (filters.status !== "all" && client.status !== filters.status) return false
      if (filters.segment !== "all" && segmentKey !== filters.segment) return false
      if (filters.search.trim().length) {
        const haystack = `${client.name} ${client.email} ${client.phone}`.toLowerCase()
        if (!haystack.includes(filters.search.toLowerCase())) return false
      }
      return true
    })
    return sortClients(list, sortBy, sortDirection)
  }, [clients, filters, sortBy, sortDirection])

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS)
    setSortBy("createdAt")
    setSortDirection("desc")
  }

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }))
  }

  return (
    <DashboardPageShell>
      <DashboardHeaderSearch
        value={filters.search}
        onChange={handleSearchChange}
        placeholder="Search by name, email, phone"
      />
      <DashboardPageHeader title="Client workspace" />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Всего клиентов" value={kpis.totalClients} />
        <KpiCard label="Активны (30 дн)" value={kpis.activeRecently} />
        <KpiCard label="Средний LTV" value={kpis.avgLtv} />
        <KpiCard label="Задолженность" value={kpis.totalOutstanding} />
        <KpiCard label="VIP доля" value={kpis.vipShare} />
        <KpiCard label="Gold доля" value={kpis.goldShare} />
      </section>

      <section className="rounded-[26px] border border-border/70 bg-card/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Filters & sorting
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em]"
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FilterSelect
            id="status-filter"
            label="Status"
            allLabel="All statuses"
            value={filters.status}
            options={statusFilterOptions}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          />
          <FilterSelect
            id="segment-filter"
            label="Segment"
            allLabel="Все сегменты"
            value={filters.segment}
            options={clientSegmentFilterOptions}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, segment: value }))}
          />
        </div>
        <div className="mt-4">
          <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Sort by</Label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-48 text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
              }
              aria-label="Toggle sort direction"
              title={sortDirection === "desc" ? "Descending" : "Ascending"}
            >
              {sortDirection === "desc" ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
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
                <th className="px-6 py-4">Recent rentals</th>
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
  const segmentLabel = getClientSegmentLabel(client.segment)
  const isRecognitionComplete = ["done", "done_multi", "fallback_pro"].includes(
    (client.documentRecognition?.status ?? "").toLowerCase()
  )
  const recognizedDocuments = isRecognitionComplete ? client.documents ?? [] : []
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={toRoute(`/clients/${client.id}`)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {client.name}
        </Link>
        <Badge
          className={cn(
            "px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
            getClientStatusBadgeTone(client.status)
          )}
        >
          {client.status}
        </Badge>
        <Badge
          variant="outline"
          className="border-border/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
        >
          {segmentLabel}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{client.phone}</span>
        <span>•</span>
        <span>{client.email}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <DetailItem label="Gender" value={client.gender ?? "Not specified"} />
        <span>•</span>
        <DetailItem label="Nationality" value={client.residencyCountry ?? "Unknown"} />
      </div>
      <div className="flex flex-wrap gap-2">
        {client.outstanding > 0 ? (
          <Badge
            variant="destructive"
            className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700"
          >
            Outstanding {formatCurrency(client.outstanding)}
          </Badge>
        ) : null}
        {recognizedDocuments.length
          ? recognizedDocuments.map((document) => (
              <Badge
                key={document.id}
                variant="outline"
                className="border-border/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                title={document.name}
              >
                {document.type}
              </Badge>
            ))
          : null}
      </div>
    </div>
  )
}

function EngagementCell({ client }: { client: Client }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">
            Outstanding
          </p>
          <p
            className={cn(
              "text-lg font-semibold",
              client.outstanding > 0 ? "text-rose-600" : "text-foreground"
            )}
          >
            {formatCurrency(client.outstanding)}
          </p>
        </div>
      </div>
      <div className="grid gap-3 text-xs text-muted-foreground">
        <MetricRow label="Lifetime value" value={formatCurrency(client.lifetimeValue)} />
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

function FilterSelect({
  id,
  label,
  value,
  options,
  allLabel,
  onValueChange,
}: {
  id: string
  label: string
  value: string
  options: FilterOption[]
  allLabel: string
  onValueChange: (value: string) => void
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="mt-1">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function DocumentsActivityCell({ client }: { client: Client }) {
  const rentals = [...client.rentals]
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 2)
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rentals.map((rental) => (
          <RentalRow key={rental.bookingId} rental={rental} />
        ))}
        {!rentals.length ? (
          <p className="text-xs text-muted-foreground">No rentals recorded.</p>
        ) : null}
      </div>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-card/80 shadow-sm">
      <div className="space-y-1 p-4 pb-1.5">
        <p className="text-[0.55rem] uppercase tracking-[0.35em] text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="p-4 pt-1.5">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

function RentalRow({ rental }: { rental: Client["rentals"][number] }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
      <div>
        <Link
          href={toRoute(`/operations/bookings/${rental.bookingId}`)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {rental.carName}
        </Link>
        <p>
          {formatDateRange(rental.startDate, rental.endDate)} ·{" "}
          {formatCurrency(rental.totalAmount)}
        </p>
      </div>
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label}: <span className="font-semibold text-foreground">{value}</span>
    </span>
  )
}

function sortClients(clients: Client[], sortBy: SortOption, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1
  const list = [...clients]
  if (sortBy === "lifetimeValue") {
    return list.sort(
      (a, b) => ((a.lifetimeValue ?? 0) - (b.lifetimeValue ?? 0)) * multiplier
    )
  }
  if (sortBy === "lastBooking") {
    return list.sort((a, b) => {
      const aTs = a.lastBookingDate ? Date.parse(a.lastBookingDate) : 0
      const bTs = b.lastBookingDate ? Date.parse(b.lastBookingDate) : 0
      return (aTs - bTs) * multiplier
    })
  }
  return list.sort((a, b) => {
    const aCreated = Date.parse(a.createdAt ?? "") || 0
    const bCreated = Date.parse(b.createdAt ?? "") || 0
    return (aCreated - bCreated) * multiplier
  })
}

/**
 * Локальный хелпер: маппинг статуса клиента к цвету Badge.
 */
function getClientStatusBadgeTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "vip") {
    return "bg-purple-100 text-purple-700 border-purple-200"
  }
  if (normalized === "gold") {
    return "bg-amber-100 text-amber-700 border-amber-200"
  }
  if (normalized === "silver") {
    return "bg-slate-100 text-slate-700 border-slate-200"
  }
  return "bg-muted text-muted-foreground border-border/50"
}
