"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import { OperationsFleetTable } from "@/components/operations-fleet-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Booking, CalendarEvent, FleetCar } from "@/lib/domain/entities"
import { calculateVehicleRuntimeMetrics } from "@/lib/fleet/runtime"

interface OperationsFleetClientProps {
  vehicles: FleetCar[]
  bookings: Booking[]
  events: CalendarEvent[]
}

type FleetFilterState = {
  search: string
  bodyStyle: string
  minSeats?: number
  yearFrom?: number
  yearTo?: number
}

type SortOption = "year" | "revenue" | "utilization"
type SortDirection = "asc" | "desc"

const DEFAULT_FILTERS: FleetFilterState = {
  search: "",
  bodyStyle: "all",
}

export function OperationsFleetClient({ vehicles, bookings, events }: OperationsFleetClientProps) {
  const [filters, setFilters] = useState<FleetFilterState>(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState<SortOption>("year")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const nextEventsMap = useMemo(() => buildNextEventMap(events), [events])
  const runtimeByVehicle = useMemo(() => buildVehicleRuntimeMap(vehicles, bookings), [vehicles, bookings])
  const filteredVehicles = useMemo(() => {
    const base = filterVehicles(vehicles, filters)
    return sortFleetCars(base, sortBy, sortDirection, runtimeByVehicle)
  }, [vehicles, filters, sortBy, sortDirection, runtimeByVehicle])

  const bodyStyleOptions = useMemo(() => buildUniqueOptions(vehicles, (vehicle) => vehicle.bodyStyle ?? "—"), [vehicles])

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Fleet Directory</h1>
        </div>
      </header>

      <section className="rounded-[26px] border border-border/70 bg-card/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Filters & search</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Reset
          </Button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <Label htmlFor="fleet-search" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Search
            </Label>
            <Input
              id="fleet-search"
              placeholder="Search make, model, plate, VIN"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="mt-1"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FilterSelect
              label="Body type"
              value={filters.bodyStyle}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, bodyStyle: value }))}
              options={bodyStyleOptions}
            />
            <div>
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Sort by</Label>
              <div className="mt-1 flex items-center gap-2">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">Year</SelectItem>
                    <SelectItem value="revenue">Revenue YTD</SelectItem>
                    <SelectItem value="utilization">Utilisation</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))}
                  aria-label="Toggle sort direction"
                  title={sortDirection === "desc" ? "Descending" : "Ascending"}
                >
                  {sortDirection === "desc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <NumberFilter
            id="fleet-min-seats"
            label="Min seats"
            placeholder="5"
            value={filters.minSeats}
            onChange={(value) => setFilters((prev) => ({ ...prev, minSeats: value }))}
          />
          <NumberFilter
            id="fleet-year-from"
            label="Year from"
            placeholder="2022"
            value={filters.yearFrom}
            onChange={(value) => setFilters((prev) => ({ ...prev, yearFrom: value }))}
          />
          <NumberFilter
            id="fleet-year-to"
            label="Year to"
            placeholder="2025"
            value={filters.yearTo}
            onChange={(value) => setFilters((prev) => ({ ...prev, yearTo: value }))}
          />
        </div>
      </section>

      <OperationsFleetTable cars={filteredVehicles} nextEvents={nextEventsMap} runtime={runtimeByVehicle} />
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

function buildNextEventMap(events: CalendarEvent[]) {
  const now = Date.now()
  const byVehicle = new Map<string, CalendarEvent[]>()
  events.forEach((event) => {
    if (!event.carId) return
    const list = byVehicle.get(String(event.carId)) ?? []
    list.push(event)
    byVehicle.set(String(event.carId), list)
  })

  const entries: [string, CalendarEvent][] = []
  byVehicle.forEach((list, vehicleId) => {
    const upcoming = list
      .filter((event) => new Date(event.end).getTime() >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0]
    if (upcoming) {
      entries.push([vehicleId, upcoming])
    }
  })

  return Object.fromEntries(entries) as Record<string, CalendarEvent>
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

function sortFleetCars(
  cars: FleetCar[],
  sortBy: SortOption,
  direction: SortDirection,
  runtime: Record<string, VehicleRuntimeSnapshot>
) {
  const list = [...cars]
  const multiplier = direction === "asc" ? 1 : -1
  if (sortBy === "year") {
    return list.sort((a, b) => ((a.year ?? 0) - (b.year ?? 0)) * multiplier)
  }
  if (sortBy === "revenue") {
    return list.sort(
      (a, b) => (getRuntimeValue(a, runtime, "revenueYTD") - getRuntimeValue(b, runtime, "revenueYTD")) * multiplier
    )
  }
  if (sortBy === "utilization") {
    return list.sort(
      (a, b) => (getRuntimeValue(a, runtime, "utilization") - getRuntimeValue(b, runtime, "utilization")) * multiplier
    )
  }
  return list
}

function getRuntimeValue(vehicle: FleetCar, runtime: Record<string, VehicleRuntimeSnapshot>, key: "revenueYTD" | "utilization") {
  const entry = runtime[String(vehicle.id)]
  if (entry) {
    return entry[key]
  }
  if (key === "revenueYTD") {
    return vehicle.revenueYTD ?? 0
  }
  if (key === "utilization") {
    return vehicle.utilization ?? 0
  }
  return 0
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

    if (filters.minSeats && (vehicle.seatingCapacity ?? 0) < filters.minSeats) {
      return false
    }

    if (filters.yearFrom && vehicle.year < filters.yearFrom) {
      return false
    }

    if (filters.yearTo && vehicle.year > filters.yearTo) {
      return false
    }

    return true
  })
}

function FilterSelect({ label, value, onValueChange, options }: { label: string; value: string; onValueChange: (value: string) => void; options: string[] }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option} className="capitalize">
              {option === "all" ? "All" : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function NumberFilter({ id, label, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value?: number; onChange: (value?: number) => void }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        placeholder={placeholder}
        value={value ? String(value) : ""}
        onChange={(event) => {
          const next = event.target.value
          onChange(next ? Number(next) : undefined)
        }}
        className="mt-1"
      />
    </div>
  )
}
