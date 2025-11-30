"use client"

import { useMemo, useState } from "react"
import { Car, Filter, Layers, RotateCcw, ShieldCheck, type LucideIcon } from "lucide-react"

import type { Booking, FleetCar } from "@/lib/domain/entities"
import { calculateVehicleRuntimeMetrics } from "@/lib/fleet/runtime"
import { OperationsFleetTable } from "@/components/operations-fleet-table"
import { DashboardHeaderSearch } from "@/components/dashboard-header-search"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface OperationsFleetClientProps {
  vehicles: FleetCar[]
  bookings: Booking[]
}

type FleetFilterState = {
  search: string
  bodyStyle: string
  status: string
}

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "in_rent", label: "In Rent" },
  { value: "maintenance", label: "Maintenance" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "service_car", label: "Service Car" },
] as const

const DEFAULT_FILTERS: FleetFilterState = {
  search: "",
  bodyStyle: "all",
  status: "all",
}

export function OperationsFleetClient({ vehicles, bookings }: OperationsFleetClientProps) {
  const [filters, setFilters] = useState<FleetFilterState>(DEFAULT_FILTERS)

  const runtimeByVehicle = useMemo(() => buildVehicleRuntimeMap(vehicles, bookings), [vehicles, bookings])
  const filteredVehicles = useMemo(
    () => filterVehicles(vehicles, filters),
    [vehicles, filters]
  )

  const bodyStyleOptions = useMemo(
    () => buildUniqueOptions(vehicles, (vehicle) => vehicle.bodyStyle ?? "—").map((value) => ({ value, label: value === "all" ? "All" : value })),
    [vehicles]
  )
  const statusOptions = STATUS_FILTER_OPTIONS

  return (
    <div className="space-y-8">
      <DashboardHeaderSearch
        value={filters.search}
        onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
        placeholder="Search car, plate, VIN…"
        actions={
          <TooltipProvider delayDuration={100}>
            <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-slate-950/80 px-2 py-1.5 text-slate-100 shadow-[0_10px_40px_-28px_rgba(0,0,0,0.6)] md:gap-2.5">
              <FilterSelect
                label="Body type"
                value={filters.bodyStyle}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, bodyStyle: value }))}
                options={bodyStyleOptions}
                icon={Car}
                ariaLabel="Filter by body type"
              />
              <FilterSelect
                label="Status"
                value={filters.status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                options={statusOptions}
                icon={ShieldCheck}
                ariaLabel="Filter by status"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full border border-white/15 bg-white/5 p-0 text-slate-100 hover:bg-white/10"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    aria-label="Reset filters"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset filters</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        }
      />

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Fleet Directory</h1>
        </div>
      </header>

      <OperationsFleetTable cars={filteredVehicles} runtime={runtimeByVehicle} />
    </div>
  )
}

function buildUniqueOptions(vehicles: FleetCar[], getter: (vehicle: FleetCar) => string | undefined) {
  const set = new Set<string>()
  vehicles.forEach((vehicle) => {
    const value = getter(vehicle)
    if (value) {
      set.add(value)
    }
  })
  return ["all", ...Array.from(set)]
}

type VehicleRuntimeSnapshot = {
  status: string
  utilization: number
  revenueYTD: number
}

function buildVehicleRuntimeMap(vehicles: FleetCar[], bookings: Booking[]): Record<string, VehicleRuntimeSnapshot> {
  const now = Date.now()

  const bookingsByVehicle = new Map<string, Booking[]>()
  bookings.forEach((booking) => {
    if (!booking.carId) return
    const key = String(booking.carId)
    const list = bookingsByVehicle.get(key) ?? []
    list.push(booking)
    bookingsByVehicle.set(key, list)
  })
  bookingsByVehicle.forEach((list, key) => {
    const sorted = [...list].sort((a, b) => Date.parse(b.startDate) - Date.parse(a.startDate))
    bookingsByVehicle.set(key, sorted)
  })

  const runtime: Record<string, VehicleRuntimeSnapshot> = {}

  vehicles.forEach((vehicle) => {
    const key = String(vehicle.id)
    const vehicleBookings = bookingsByVehicle.get(key) ?? []
    const activeBooking = vehicleBookings.find((booking) => isActiveBooking(booking, now))
    const fallbackBooking = vehicleBookings[0]
    const statusSource = activeBooking ?? fallbackBooking
    const status = statusSource ? formatBookingStatusLabel(statusSource.status) : "Available"
    const { utilization, revenueYTD } = calculateVehicleRuntimeMetrics(vehicleBookings, new Date(now))

    runtime[key] = {
      status,
      utilization,
      revenueYTD,
    }
  })

  return runtime
}

function isActiveBooking(booking: Booking, nowMs: number) {
  const start = Date.parse(booking.startDate)
  const end = Date.parse(booking.endDate)
  if (Number.isNaN(start) || Number.isNaN(end)) return false
  return start <= nowMs && nowMs <= end
}

function formatBookingStatusLabel(status?: Booking["status"]) {
  if (!status) return "Available"
  switch (status) {
    case "new":
      return "New"
    case "preparation":
      return "Preparation"
    case "delivery":
      return "Delivery"
    case "in-rent":
      return "In Rent"
    case "settlement":
      return "Settlement"
    default:
      return status
  }
}

function filterVehicles(vehicles: FleetCar[], filters: FleetFilterState) {
  const query = filters.search.trim().toLowerCase()
  const normalizedFilterStatusValue = filters.status.trim().toLowerCase().replace(/[-\s]+/g, "_")
  return vehicles.filter((vehicle) => {
    if (query) {
      const haystack = [vehicle.make, vehicle.model, vehicle.name, vehicle.plate, vehicle.vin].filter(Boolean).join(" ").toLowerCase()
      if (!haystack.includes(query)) {
        return false
      }
    }

    if (filters.bodyStyle !== "all" && (vehicle.bodyStyle ?? "Body type") !== filters.bodyStyle) {
      return false
    }

    if (normalizedFilterStatusValue !== "all") {
      const normalizedVehicleStatus = (vehicle.status ?? "").trim().toLowerCase().replace(/[-\s]+/g, "_")
      if (normalizedVehicleStatus !== normalizedFilterStatusValue) {
        return false
      }
    }

    return true
  })
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  icon: Icon,
  ariaLabel,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: ReadonlyArray<{ value: string; label: string }>
  icon: LucideIcon
  ariaLabel: string
}) {
  return (
    <Tooltip>
      <Select value={value} onValueChange={onValueChange}>
        <TooltipTrigger asChild>
          <SelectTrigger
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-slate-900/70 p-0 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/5 [&>svg:last-of-type]:hidden"
            aria-label={ariaLabel}
          >
            <Icon className="mx-auto h-4 w-4" />
          </SelectTrigger>
        </TooltipTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="capitalize">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
