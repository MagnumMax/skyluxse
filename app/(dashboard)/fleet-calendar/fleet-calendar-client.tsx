"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import "./fleet-calendar.css"

import { DashboardPageShell } from "@/components/dashboard-page-shell"
import {
  FleetCalendarBoard,
  calendarViewOptions,
  isLostCalendarEvent,
  useFleetCalendarController,
} from "@/components/fleet-calendar"
import type { Booking, CalendarEvent, FleetCar } from "@/lib/domain/entities"
import { calculateVehicleRuntimeMetrics } from "@/lib/fleet/runtime"
import { calendarEventTypes } from "@/lib/constants/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FilterIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

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
  const calendarController = useFleetCalendarController()
  const sanitizedEvents = useMemo(
    () => events.filter((event) => !isLostCalendarEvent(event)),
    [events]
  )
  const metrics = useMemo(
    () => buildCalendarMetrics(vehicles, bookings, sanitizedEvents),
    [bookings, sanitizedEvents, vehicles]
  )
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
      sanitizedEvents.filter((event) => {
        if (!layerFilters[event.type as CalendarLayer]) return false
        return visibleVehicleIds.has(String(event.carId))
      }),
    [layerFilters, sanitizedEvents, visibleVehicleIds]
  )

  return (
    <DashboardPageShell>
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
  const [expanded, setExpanded] = useState(false)
  const presetViewOptions = calendarViewOptions.filter((option) => option.id !== "custom")

  return (
    <Card className="rounded-[26px] border border-border/70 bg-card/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Filters & views
          </CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="flex items-center gap-2 rounded-full border border-border/60 px-3"
        >
          {expanded ? (
            <>
              Hide panel
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Show panel
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </CardHeader>
      {expanded ? (
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="flex w-full flex-wrap items-center gap-2 md:gap-3">
            <Tabs
              value={controller.view.id}
              onValueChange={(value) => controller.setView((value as typeof calendarViewOptions[number]["id"]) ?? "week")}
              className="w-full min-[520px]:w-auto"
            >
              <TabsList className="flex flex-wrap gap-2 bg-transparent p-0">
                {presetViewOptions.map((option) => (
                  <TabsTrigger
                    key={option.id}
                    value={option.id}
                    className="rounded-full border border-border/60 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <CustomRangePicker
              value={controller.customRange}
              onChange={(range) => controller.setCustomRange(range)}
              onClear={() => controller.clearCustomRange()}
            />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={controller.goPrev} aria-label="Previous range" className="px-3">
                <ChevronLeft className="mr-1 h-4 w-4" /> Prev
              </Button>
              <Button variant="ghost" size="sm" onClick={controller.goToday} className="px-3">
                Today
              </Button>
              <Button variant="ghost" size="sm" onClick={controller.goNext} aria-label="Next range" className="px-3">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-3 md:grid-cols-[minmax(240px,1.1fr)_minmax(180px,0.9fr)_minmax(200px,0.8fr)]">
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="calendar-search" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Search
              </Label>
              <Input
                id="calendar-search"
                placeholder="Search car, plate, booking…"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex min-w-[180px] flex-col gap-1">
              <Label htmlFor="calendar-grouping" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Group by
              </Label>
              <Select value={controller.grouping} onValueChange={(value) => controller.setGrouping(value as any)}>
                <SelectTrigger id="calendar-grouping" className="h-10">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bodyStyle">Body type</SelectItem>
                  <SelectItem value="manufacturer">Make</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-end justify-start gap-2 md:justify-end">
              <LayerFilterPopover
                filters={layerFilters}
                metrics={metrics}
                onToggle={onToggleLayer}
              />
              <Button variant="ghost" size="sm" onClick={onReset}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      ) : null}
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

export function CustomRangePicker({
  value,
  onChange,
  onClear,
}: {
  value: DateRange | null
  onChange: (range: DateRange | null) => void
  onClear: () => void
}) {
  const [draft, setDraft] = useState<DateRange | undefined>(() => value ?? undefined)
  const [open, setOpen] = useState(false)
  const hasSelection = Boolean(value?.from && value?.to)
  const label = formatRangeLabel(value)

  const handleSelect = (nextRange?: DateRange) => {
    setDraft(nextRange ?? undefined)
    if (nextRange?.from && nextRange?.to) {
      onChange(nextRange)
    }
  }

  const handleClear = () => {
    setDraft(undefined)
    onClear()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setDraft(value ?? undefined)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] ${
            hasSelection ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"
          }`}
        >
          <CalendarRange className="h-4 w-4" />
          <span>{hasSelection ? label : "Custom dates"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto space-y-4 rounded-2xl border border-border/70 bg-popover/95 p-4 shadow-lg" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={draft}
          onSelect={handleSelect}
          defaultMonth={draft?.from ?? value?.from ?? new Date()}
          initialFocus
          className="gap-6 p-5 [--cell-size:2.4rem] [&_.rdp-months]:gap-7 [&_.rdp-months]:items-start [&_.rdp-month]:gap-4 [&_.rdp-month]:rounded-xl [&_.rdp-month]:border [&_.rdp-month]:border-border/60 [&_.rdp-month]:bg-background/70 [&_.rdp-month]:px-6 [&_.rdp-month]:py-4 [&_.rdp-head]:mb-2 [&_.rdp-head_cell]:text-[0.75rem] [&_.rdp-head_cell]:font-semibold [&_.rdp-head_cell]:text-muted-foreground [&_.rdp-table]:border-separate [&_.rdp-table]:border-spacing-x-5 [&_.rdp-table]:border-spacing-y-2 [&_.rdp-day]:text-[0.95rem] [&_.rdp-day]:leading-7 [&_.rdp-day]:mx-1 [&_.rdp-cell]:text-center"
        />
        <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2 text-sm">
          <p className="text-xs text-muted-foreground leading-5">
            {hasSelection ? `Selected ${label}` : "Pick start and end dates"}
          </p>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={!hasSelection} className="h-8 px-3 font-medium">
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function formatRangeLabel(range: DateRange | null) {
  if (!range?.from || !range?.to) return "Custom dates"
  const start = range.from
  const end = range.to
  const sameYear = start.getFullYear() === end.getFullYear()
  const monthDayFormatter = new Intl.DateTimeFormat("en-GB", { month: "short", day: "2-digit" })
  const monthDayYearFormatter = new Intl.DateTimeFormat("en-GB", { month: "short", day: "2-digit", year: "numeric" })
  const startLabel = (sameYear ? monthDayFormatter : monthDayYearFormatter).format(start)
  const endLabel = monthDayYearFormatter.format(end)
  return `${startLabel} → ${endLabel}`
}

export function resetFilters(
  setLayerFilters: (value: Record<CalendarLayer, boolean>) => void,
  controller: ReturnType<typeof useFleetCalendarController>,
  setSearchQuery: (value: string) => void,
  setPinnedVehicleId: (value: string | null) => void
) {
  setLayerFilters({ reservation: true, rental: true, maintenance: true, repair: true })
  controller.clearCustomRange()
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
