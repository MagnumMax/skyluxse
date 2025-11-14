"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import "./fleet-calendar.css"

import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { FleetCalendarBoard, calendarViewOptions, useFleetCalendarController } from "@/components/fleet-calendar"
import type { Booking, CalendarEvent, FleetCar } from "@/lib/domain/entities"
import { calculateVehicleRuntimeMetrics } from "@/lib/fleet/runtime"
import { calendarEventTypes } from "@/lib/constants/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, FilterIcon } from "lucide-react"

export type CalendarLayer = "reservation" | "rental" | "maintenance" | "repair"

interface OperationsFleetCalendarClientProps {
  vehicles: FleetCar[]
  bookings: Booking[]
  events: CalendarEvent[]
  initialVehicleId?: string | null
}

export function OperationsFleetCalendarClient({
  vehicles,
  bookings,
  events,
  initialVehicleId,
}: OperationsFleetCalendarClientProps) {
  const router = useRouter()
  const metrics = useMemo(() => buildCalendarMetrics(vehicles, bookings, events), [vehicles, bookings, events])
  const calendarController = useFleetCalendarController()
  const normalizedInitialVehicleId = initialVehicleId ? String(initialVehicleId) : undefined
  const initialVehicle = normalizedInitialVehicleId
    ? vehicles.find((vehicle) => String(vehicle.id) === normalizedInitialVehicleId)
    : undefined
  const initialSearchPrefill = initialVehicle ? buildVehicleSearchLabel(initialVehicle) : ""
  const [layerFilters, setLayerFilters] = useState<Record<CalendarLayer, boolean>>({
    reservation: true,
    rental: true,
    maintenance: true,
    repair: true,
  })
  const [searchQuery, setSearchQuery] = useState(() => initialSearchPrefill)
  const [pinnedVehicleId, setPinnedVehicleId] = useState<string | null>(() => (initialVehicle ? String(initialVehicle.id) : null))

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (pinnedVehicleId) {
      setPinnedVehicleId(null)
    }
  }

  const filteredVehicles = useMemo(() => {
    const sorted = [...vehicles].sort(sortVehicles)
    if (pinnedVehicleId) {
      return sorted.filter((vehicle) => String(vehicle.id) === pinnedVehicleId)
    }
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sorted
    return sorted.filter((vehicle) => {
      const haystack = `${vehicle.name} ${vehicle.plate}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [pinnedVehicleId, searchQuery, vehicles])

  const visibleVehicleIds = useMemo(() => new Set(filteredVehicles.map((vehicle) => String(vehicle.id))), [filteredVehicles])

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (!layerFilters[event.type as CalendarLayer]) return false
        return visibleVehicleIds.has(String(event.carId))
      }),
    [events, layerFilters, visibleVehicleIds]
  )

  return (
    <DashboardPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Calendar & load</h1>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Vehicles tracked" value={metrics.totalVehicles.toString()} />
        <KpiCard label="Avg utilisation (30D)" value={`${metrics.avgUtilization}%`} />
        <KpiCard label="In maintenance" value={metrics.maintenanceVehicles.toString()} />
        <KpiCard label="Repair conflicts" value={metrics.repairEvents.toString()} tone="text-rose-600" />
      </section>

      <FleetCalendarToolbar
        controller={calendarController}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        layerFilters={layerFilters}
        metrics={metrics}
        onToggleLayer={(layer) => setLayerFilters((prev) => ({ ...prev, [layer]: !prev[layer] }))}
        onReset={() => resetFilters(setLayerFilters, calendarController, setSearchQuery, setPinnedVehicleId)}
      />

      <FleetCalendarBoard
        controller={calendarController}
        vehicles={filteredVehicles}
        events={filteredEvents}
        onEventClick={(event) => {
          if (!event.bookingId) return
          const bookingId = String(event.bookingId)
          router.push(`/bookings/${bookingId}?view=operations`)
        }}
      />
    </DashboardPageShell>
  )
}

export const layerMeta: Record<CalendarLayer, { label: string; countLabel: (metrics: CalendarMetrics) => string }> = {
  reservation: {
    label: "Reservations",
    countLabel: (metrics) => `${metrics.reservationEvents} pending`,
  },
  rental: {
    label: "Rentals",
    countLabel: (metrics) => `${metrics.activeRentals} active`,
  },
  maintenance: {
    label: "Maintenance",
    countLabel: (metrics) => `${metrics.maintenanceEvents} scheduled`,
  },
  repair: {
    label: "Repairs",
    countLabel: (metrics) => `${metrics.repairEvents} flagged`,
  },
}

export const EVENT_LAYER_ORDER: CalendarLayer[] = ["reservation", "rental", "maintenance", "repair"]

type CalendarMetrics = ReturnType<typeof buildCalendarMetrics>

export function buildCalendarMetrics(vehicles: FleetCar[], bookings: Booking[], events: CalendarEvent[]) {
  const totalVehicles = vehicles.length
  const bookingsByVehicle = new Map<string, Booking[]>()
  bookings.forEach((booking) => {
    if (!booking.carId) return
    const key = String(booking.carId)
    const list = bookingsByVehicle.get(key)
    if (list) {
      list.push(booking)
    } else {
      bookingsByVehicle.set(key, [booking])
    }
  })

  const runtimeUtilization = new Map<string, number>()
  bookingsByVehicle.forEach((vehicleBookings, vehicleId) => {
    const { utilization } = calculateVehicleRuntimeMetrics(vehicleBookings)
    runtimeUtilization.set(vehicleId, utilization)
  })

  const utilizationSum = vehicles.reduce((acc, car) => {
    const runtimeValue = runtimeUtilization.get(String(car.id))
    const value = Number.isFinite(runtimeValue) ? (runtimeValue as number) : car.utilization ?? 0
    return acc + (Number.isFinite(value) ? value : 0)
  }, 0)

  const avgUtilization = Math.round((utilizationSum / Math.max(totalVehicles, 1)) * 100)
  const maintenanceVehicles = vehicles.filter((car) => car.status === "Maintenance").length
  const maintenanceEvents = events.filter((event) => event.type === "maintenance").length
  const repairEvents = events.filter((event) => event.type === "repair").length
  const activeRentals = events.filter((event) => event.type === "rental").length
  const reservationEvents = events.filter((event) => event.type === "reservation").length

  return {
    totalVehicles,
    avgUtilization: Number.isFinite(avgUtilization) ? avgUtilization : 0,
    maintenanceVehicles,
    maintenanceEvents,
    repairEvents,
    reservationEvents,
    activeRentals,
  }
}

function FleetCalendarToolbar({
  controller,
  searchQuery,
  onSearchChange,
  layerFilters,
  metrics,
  onToggleLayer,
  onReset,
}: {
  controller: ReturnType<typeof useFleetCalendarController>
  searchQuery: string
  onSearchChange: (value: string) => void
  layerFilters: Record<CalendarLayer, boolean>
  metrics: CalendarMetrics
  onToggleLayer: (layer: CalendarLayer) => void
  onReset: () => void
}) {
  const activeCount = EVENT_LAYER_ORDER.filter((layer) => layerFilters[layer]).length

  return (
    <Card className="rounded-[26px] border border-border/70 bg-card/80 shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="flex w-full flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="calendar-search" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Search
            </Label>
            <Input
              id="calendar-search"
              placeholder="Search car, plate, booking…"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <Tabs
            value={controller.view.id}
            onValueChange={(value) => controller.setView((value as typeof calendarViewOptions[number]["id"]) ?? "week")}
            className="w-full min-[480px]:w-auto"
          >
            <TabsList className="flex flex-wrap gap-2 bg-transparent p-0">
              {calendarViewOptions.map((option) => (
                <TabsTrigger
                  key={option.id}
                  value={option.id}
                  className="rounded-full border border-border/60 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={controller.goPrev} aria-label="Previous range">
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </Button>
            <Button variant="ghost" size="sm" onClick={controller.goToday}>
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={controller.goNext} aria-label="Next range">
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <Label htmlFor="calendar-grouping" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Group by
            </Label>
            <Select value={controller.grouping} onValueChange={(value) => controller.setGrouping(value as any)}>
              <SelectTrigger id="calendar-grouping">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bodyStyle">Body type</SelectItem>
                <SelectItem value="manufacturer">Make</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LayerFilterPopover
              filters={layerFilters}
              metrics={metrics}
              onToggle={onToggleLayer}
            />
            <Button variant="ghost" size="sm" onClick={onReset}>
              Reset
            </Button>
            <div className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              Active layers {activeCount}/{EVENT_LAYER_ORDER.length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LayerFilterPopover({
  filters,
  metrics,
  onToggle,
}: {
  filters: Record<CalendarLayer, boolean>
  metrics: CalendarMetrics
  onToggle: (layer: CalendarLayer) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4" />
          Events
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2 rounded-2xl border border-border/70 bg-card/95 p-3 text-sm shadow-lg" align="end">
        {EVENT_LAYER_ORDER.map((layer) => {
          const meta = layerMeta[layer]
          const indicatorClasses = `${calendarEventTypes[layer].surface} ${calendarEventTypes[layer].border}`
          return (
            <label
              key={layer}
              className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-background/40"
            >
              <Checkbox
                checked={filters[layer]}
                onCheckedChange={() => onToggle(layer)}
              />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${indicatorClasses}`} />
                  <span className="font-semibold text-foreground">{meta.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{meta.countLabel(metrics)}</span>
              </div>
            </label>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

export function resetFilters(
  setLayerFilters: (value: Record<CalendarLayer, boolean>) => void,
  controller: ReturnType<typeof useFleetCalendarController>,
  setSearchQuery: (value: string) => void,
  setPinnedVehicleId: (value: string | null) => void
) {
  setLayerFilters({ reservation: true, rental: true, maintenance: true, repair: true })
  controller.setView("week")
  controller.goToday()
  setSearchQuery("")
  setPinnedVehicleId(null)
}

export function buildVehicleSearchLabel(vehicle: FleetCar) {
  const parts = [vehicle.name?.trim(), vehicle.plate?.trim()].filter(Boolean)
  return parts.join(" · ")
}

export function sortVehicles(a: FleetCar, b: FleetCar) {
  return (b.utilization ?? 0) - (a.utilization ?? 0)
}

export function KpiCard({ label, value, trend, tone }: { label: string; value: string; trend?: string; tone?: string }) {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/90">
      <CardContent className="space-y-1.5 p-4">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-2xl font-semibold text-foreground ${tone ?? ""}`}>{value}</p>
          {trend ? <span className="text-xs font-medium text-emerald-600">{trend}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
