import Link from "next/link"
import { CalendarDays } from "lucide-react"

import type { CalendarEvent, FleetCar } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const referenceDate = new Date()

type NextEventMap = Record<string, CalendarEvent | undefined>
type RuntimeMap = Record<string, { status: string; utilization: number; revenueYTD: number }>

export function OperationsFleetTable({
  cars,
  nextEvents,
  runtime,
}: {
  cars: FleetCar[]
  nextEvents?: NextEventMap
  runtime?: RuntimeMap
}) {
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
          {cars.map((car) => (
            <tr key={car.id} className="align-top">
              <td className="px-6 py-5">
                <VehicleCell car={car} nextEvent={nextEvents?.[String(car.id)]} runtime={runtime?.[String(car.id)]} />
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

function VehicleCell({
  car,
  nextEvent,
  runtime,
}: {
  car: FleetCar
  nextEvent?: CalendarEvent
  runtime?: { status: string; utilization: number; revenueYTD: number }
}) {
  const displayName = car.name || [car.make, car.model].filter(Boolean).join(" ") || "Unnamed vehicle"
  const statusLabel = runtime?.status ?? car.status ?? "Available"
  const utilization = runtime?.utilization ?? car.utilization ?? 0
  const revenueYtd = runtime?.revenueYTD ?? car.revenueYTD ?? 0
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={toRoute(`/fleet/${car.id}`)} className="text-base font-semibold text-primary hover:underline">
          {displayName}
        </Link>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">{car.plate}</span>
        <CalendarLink carId={String(car.id)} nextEvent={nextEvent} />
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Badge
          className={cn(
            "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
            getVehicleStatusBadgeTone(statusLabel)
          )}
        >
          {statusLabel}
        </Badge>
        <span>Mileage {formatNumber(car.mileage)} km</span>
        <span>Utilisation {(utilization * 100).toFixed(0)}%</span>
        <span>Revenue YTD {formatCurrency(revenueYtd)}</span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge
          variant="outline"
          className="border-border/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em]"
        >
          VIN {car.vin ?? "—"}
        </Badge>
      </div>
    </div>
  )
}

function CalendarLink({ carId, nextEvent }: { carId: string; nextEvent?: CalendarEvent }) {
  const label = nextEvent ? `${formatEventType(nextEvent.type)} · ${formatDate(nextEvent.start)} → ${formatDate(nextEvent.end)}` : "Fleet calendar"
  return (
    <Link
      href={toRoute(`/fleet-calendar?vehicleId=${encodeURIComponent(carId)}`)}
      className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-primary"
      title={label}
    >
      <CalendarDays className="h-3 w-3" />
      <span>{nextEvent ? "Next slot" : "Calendar"}</span>
    </Link>
  )
}

function formatEventType(value?: string) {
  if (!value) return "Event"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function VehicleYearCell({ car }: { car: FleetCar }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{car.year}</p>
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
        <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground">{meta.displayDate}</p>
      </div>
      <div className="text-right">
        <Badge
          variant="outline"
          className={cn(
            "px-2 py-0.5 text-[11px] font-semibold",
            meta.badgeVariantClass
          )}
        >
          {meta.label}
        </Badge>
        <p className={cn("text-[0.6rem]", meta.accent)}>{meta.daysLabel}</p>
      </div>
    </div>
  )
}

function getExpiryMeta(value?: string) {
  if (!value) {
    return {
      label: "—",
      badgeVariantClass: "",
      displayDate: "—",
      daysLabel: "No date",
      accent: "text-muted-foreground",
    }
  }

  const date = new Date(value)
  const diffMs = date.getTime() - referenceDate.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return {
      label: "Expired",
      badgeVariantClass: "border-destructive/40 bg-destructive/10 text-destructive",
      displayDate: formatDate(value),
      daysLabel: `${Math.abs(diffDays)}d overdue`,
      accent: "text-destructive",
    }
  }

  if (diffDays <= 30) {
    return {
      label: "Due soon",
      badgeVariantClass: "border-amber-300 bg-amber-50 text-amber-700",
      displayDate: formatDate(value),
      daysLabel: `${diffDays}d left`,
      accent: "text-amber-600",
    }
  }

  return {
    label: "Active",
    badgeVariantClass: "border-emerald-300 bg-emerald-50 text-emerald-700",
    displayDate: formatDate(value),
    daysLabel: `${diffDays}d left`,
    accent: "text-emerald-600",
  }
}

/**
 * Маппинг статусов машины к тону бейджа.
 * Локальный хелпер, не меняет входные пропсы компонента.
 */
function getVehicleStatusBadgeTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes("available")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }
  if (normalized.includes("in-rent") || normalized.includes("rented")) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200"
  }
  if (normalized.includes("maintenance") || normalized.includes("service")) {
    return "bg-amber-50 text-amber-700 border-amber-200"
  }
  if (normalized.includes("offline") || normalized.includes("inactive")) {
    return "bg-slate-100 text-slate-600 border-slate-200"
  }
  return "bg-slate-50 text-slate-700 border-slate-200"
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
