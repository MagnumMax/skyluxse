import Link from "next/link"

import type { FleetCar } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"

const statusPriority: Record<string, number> = { "In Rent": 0, Maintenance: 1, Available: 2 }
const statusTone: Record<string, string> = {
  Available: "bg-emerald-100 text-emerald-700",
  "In Rent": "bg-indigo-100 text-indigo-700",
  Maintenance: "bg-amber-100 text-amber-700",
}

const referenceDate = new Date()

export function OperationsFleetTable({ cars }: { cars: FleetCar[] }) {
  const sorted = [...cars].sort((a, b) => {
    const priorityDiff = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99)
    if (priorityDiff !== 0) return priorityDiff
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="overflow-hidden rounded-[28px] border border-border/70 bg-card/80">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            <th className="px-6 py-4">Vehicle</th>
            <th className="px-6 py-4">Year</th>
            <th className="px-6 py-4">Compliance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {sorted.map((car) => (
            <tr key={car.id} className="align-top">
              <td className="px-6 py-5">
                <VehicleCell car={car} />
              </td>
              <td className="px-6 py-5">
                <VehicleYearCell car={car} />
              </td>
              <td className="px-6 py-5">
                <ComplianceCell car={car} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VehicleCell({ car }: { car: FleetCar }) {
  const badgeClass = statusTone[car.status] || "bg-slate-100 text-slate-700"
  const tags = [car.class, car.segment, car.color].filter(Boolean)
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-16 w-24 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">{car.class}</span>
        <span className="text-base font-semibold text-foreground">{car.plate}</span>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={toRoute(`/operations/fleet/${car.id}`)} className="text-sm font-semibold text-primary hover:underline">
            {car.name}
          </Link>
          <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", badgeClass)}>{car.status}</span>
          <span className="rounded-full border border-border/50 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {car.location}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border/40 px-2 py-0.5">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Mileage {formatNumber(car.mileage)} km</span>
          <span>Utilization {(car.utilization * 100).toFixed(0)}%</span>
          <span>Revenue YTD {formatCurrency(car.revenueYTD)}</span>
        </div>
      </div>
    </div>
  )
}

function VehicleYearCell({ car }: { car: FleetCar }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{car.year}</p>
      <p className="text-xs text-muted-foreground">
        Health score <span className="font-semibold text-foreground">{Math.round(car.serviceStatus.health * 100)}%</span>
      </p>
      <p className="text-xs text-muted-foreground">
        Next service {formatDate(car.serviceStatus.nextService)} ({car.serviceStatus.mileageToService} km)
      </p>
    </div>
  )
}

function ComplianceCell({ car }: { car: FleetCar }) {
  const insuranceExpiry = car.documents.find((doc) => doc.type === "insurance")?.expiry ?? car.insuranceExpiry
  const mulkiyaExpiry = car.documents.find((doc) => doc.type === "mulkiya")?.expiry ?? car.mulkiyaExpiry
  return (
    <div className="space-y-4">
      <ExpiryRow label="Insurance" value={insuranceExpiry} />
      <ExpiryRow label="Mulkiya" value={mulkiyaExpiry} />
    </div>
  )
}

function ExpiryRow({ label, value }: { label: string; value?: string }) {
  const meta = getExpiryMeta(value)
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <div>
        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{meta.displayDate}</p>
      </div>
      <div className="text-right">
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.badgeClass)}>{meta.label}</span>
        <p className={cn("text-[0.6rem]", meta.accent)}>{meta.daysLabel}</p>
      </div>
    </div>
  )
}

function getExpiryMeta(value?: string) {
  if (!value) {
    return { label: "—", badgeClass: "bg-slate-100 text-slate-600", displayDate: "—", daysLabel: "No date", accent: "text-muted-foreground" }
  }
  const date = new Date(value)
  const diffMs = date.getTime() - referenceDate.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) {
    return {
      label: "Expired",
      badgeClass: "bg-rose-100 text-rose-700",
      displayDate: formatDate(value),
      daysLabel: `${Math.abs(diffDays)}d overdue`,
      accent: "text-rose-600",
    }
  }
  if (diffDays <= 30) {
    return {
      label: "Due soon",
      badgeClass: "bg-amber-100 text-amber-700",
      displayDate: formatDate(value),
      daysLabel: `${diffDays}d left`,
      accent: "text-amber-600",
    }
  }
  return {
    label: "Active",
    badgeClass: "bg-emerald-100 text-emerald-700",
    displayDate: formatDate(value),
    daysLabel: `${diffDays}d left`,
    accent: "text-emerald-600",
  }
}

function formatDate(value?: string) {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(new Date(value))
  } catch {
    return value
  }
}

function formatNumber(value?: number) {
  if (!value && value !== 0) return "—"
  return new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(value)
}

function formatCurrency(value?: number) {
  if (!value && value !== 0) return "—"
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(value)
}

function toRoute(href: string) {
  return href as Parameters<typeof Link>[0]["href"]
}
