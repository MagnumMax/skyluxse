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
import { DashboardHeaderSearch } from "@/components/dashboard-header-search"
import type { Booking, CalendarEvent, FleetCar } from "@/lib/domain/entities"
import { calculateVehicleRuntimeMetrics } from "@/lib/fleet/runtime"
import { calendarEventTypes } from "@/lib/constants/calendar"
import { buildVisibleDates, DAY_IN_MS } from "@/lib/fleet/calendar-grid"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, CalendarDays, ChevronLeft, ChevronRight, Layers, ListFilter, RotateCcw } from "lucide-react"
import type { DateRange } from "react-day-picker"

export type CalendarLayer = "reservation" | "rental" | "maintenance" | "repair"

type StageKey = "confirmed" | "delivery" | "car_with_customer" | "pickup" | "other"
const DEFAULT_STAGE_FILTERS: Record<StageKey, boolean> = {
  confirmed: true,
  delivery: true,
  car_with_customer: true,
  pickup: true,
  other: false,
}
const createDefaultStageFilters = () => ({ ...DEFAULT_STAGE_FILTERS })

type SortOption = "utilization" | "price" | "name"

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
  const calendarController = useFleetCalendarController("week", "none")
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
  const [stageFilters, setStageFilters] = useState<Record<StageKey, boolean>>(() => createDefaultStageFilters())
  const [sortOption, setSortOption] = useState<SortOption>("utilization")

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (pinnedVehicleId) {
      setPinnedVehicleId(null)
    }
  }

  const visibleDates = useMemo(
    () => buildVisibleDates(calendarController.baseDate, calendarController.offset, calendarController.rangeDays),
    [calendarController.baseDate, calendarController.offset, calendarController.rangeDays]
  )

  const filteredVehicles = useMemo(() => {
    const baseFiltered = vehicles.filter((vehicle) => {
      if (pinnedVehicleId && String(vehicle.id) !== pinnedVehicleId) return false
      const query = searchQuery.trim().toLowerCase()
      if (!query) return true
      const haystack = `${vehicle.name} ${vehicle.plate}`.toLowerCase()
      return haystack.includes(query)
    })

    const visibleVehicleIds = new Set(baseFiltered.map((vehicle) => String(vehicle.id)))

    const rangeStart = visibleDates[0] ?? calendarController.baseDate
    const rangeEnd = visibleDates.length
      ? new Date(visibleDates[visibleDates.length - 1].getTime() + DAY_IN_MS)
      : new Date(rangeStart.getTime() + calendarController.rangeDays * DAY_IN_MS)

    const filteredEvents = sanitizedEvents
      .filter((event) => {
        if (!layerFilters[event.type as CalendarLayer]) return false
        if (!visibleVehicleIds.has(String(event.carId))) return false
        const stageKey = resolveStageKey(event)
        if (!stageFilters[stageKey]) return false
        return true
      })
      .filter((event) => {
        const eventStart = new Date(event.start).getTime()
        const eventEnd = new Date(event.end).getTime()
        return eventEnd > rangeStart.getTime() && eventStart < rangeEnd.getTime()
      })

    const utilizationMap = buildUtilizationMap(filteredEvents, rangeStart, rangeEnd)

    const sorted = [...baseFiltered].sort((a, b) => sortVehicles(a, b, sortOption, utilizationMap))
    return { vehicles: sorted, events: filteredEvents, utilizationMap }
  }, [
    layerFilters,
    pinnedVehicleId,
    sanitizedEvents,
    searchQuery,
    sortOption,
    stageFilters,
    vehicles,
    visibleDates,
    calendarController.baseDate,
    calendarController.rangeDays,
  ])

  const visibleVehicleIds = useMemo(
    () => new Set(filteredVehicles.vehicles.map((vehicle) => String(vehicle.id))),
    [filteredVehicles.vehicles]
  )

  const filteredEvents = filteredVehicles.events

  return (
    <DashboardPageShell>
      <FleetCalendarHeaderControls
        controller={calendarController}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        layerFilters={layerFilters}
        stageFilters={stageFilters}
        metrics={metrics}
        onToggleLayer={(layer) => setLayerFilters((prev) => ({ ...prev, [layer]: !prev[layer] }))}
        onToggleStage={(key) => setStageFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
        sortOption={sortOption}
        onSortChange={setSortOption}
        onReset={() =>
          resetFilters(
            setLayerFilters,
            calendarController,
            setSearchQuery,
            setPinnedVehicleId,
            setStageFilters,
            setSortOption
          )
        }
      />

      <FleetCalendarBoard
        controller={calendarController}
        vehicles={filteredVehicles.vehicles}
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

function FleetCalendarHeaderControls({
  controller,
  searchQuery,
  onSearchChange,
  layerFilters,
  stageFilters,
  metrics,
  onToggleLayer,
  onToggleStage,
  sortOption,
  onSortChange,
  onReset,
}: {
  controller: ReturnType<typeof useFleetCalendarController>
  searchQuery: string
  onSearchChange: (value: string) => void
  layerFilters: Record<CalendarLayer, boolean>
  stageFilters: Record<StageKey, boolean>
  metrics: CalendarMetrics
  onToggleLayer: (layer: CalendarLayer) => void
  onToggleStage: (key: StageKey) => void
  sortOption: SortOption
  onSortChange: (value: SortOption) => void
  onReset: () => void
}) {
  const compactPeriodOptions = calendarViewOptions.filter((option) => option.id === "week" || option.id === "fortnight")

  return (
    <DashboardHeaderSearch
      value={searchQuery}
      onChange={onSearchChange}
      placeholder="Search car, plate, booking…"
      actions={
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
          <PeriodDropdown controller={controller} compactPeriodOptions={compactPeriodOptions} />
          <GroupingButton value={controller.grouping} onValueChange={(value) => controller.setGrouping(value as any)} />
          <StageFilterPopover filters={stageFilters} onToggle={onToggleStage} />
          <LayerFilterPopover filters={layerFilters} metrics={metrics} onToggle={onToggleLayer} />
          <SortButton value={sortOption} onValueChange={onSortChange} />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-white/20 bg-slate-900/60 text-slate-100"
            onClick={onReset}
            aria-label="Reset filters"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      }
    />
  )
}

function StageFilterPopover({
  filters,
  onToggle,
}: {
  filters: Record<StageKey, boolean>
  onToggle: (key: StageKey) => void
}) {
  const stageMeta: Record<StageKey, { label: string; description: string }> = {
    confirmed: { label: "Confirmed", description: "Payment received" },
    delivery: { label: "Delivery", description: "On the way" },
    car_with_customer: { label: "Car with customer", description: "Active rental" },
    pickup: { label: "Pickup", description: "Return scheduled" },
    other: { label: "Other", description: "Unmapped stages" },
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full border-white/20 bg-slate-900/60 text-slate-100"
          aria-label="Filter by stage"
        >
          <ListFilter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2 rounded-2xl border border-border/70 bg-card/95 p-3 text-sm shadow-lg" align="end">
        {Object.keys(stageMeta).map((key) => {
          const stageKey = key as StageKey
          const meta = stageMeta[stageKey]
          return (
            <label
              key={stageKey}
              className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-background/40"
            >
              <Checkbox
                checked={filters[stageKey]}
                onCheckedChange={() => onToggle(stageKey)}
              />
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{meta.label}</span>
                <span className="text-xs text-muted-foreground">{meta.description}</span>
              </div>
            </label>
          )
        })}
      </PopoverContent>
    </Popover>
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
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full border-white/20 bg-slate-900/60 text-slate-100"
          aria-label="Toggle event layers"
        >
          <Layers className="h-4 w-4" />
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

function CompactRangePicker({
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
          size="icon"
          className={`h-8 w-8 rounded-full border ${hasSelection ? "border-primary bg-primary/10 text-primary" : "border-white/20 bg-slate-900/60 text-slate-100"}`}
          aria-label="Custom range"
        >
          <CalendarDays className="h-4 w-4" />
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

function PeriodDropdown({
  controller,
  compactPeriodOptions,
}: {
  controller: ReturnType<typeof useFleetCalendarController>
  compactPeriodOptions: (typeof calendarViewOptions)[number][]
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border border-white/20 bg-slate-900/60 text-slate-100"
          aria-label="Period presets"
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 space-y-3 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-lg" align="start">
        <div className="flex items-center justify-between gap-2">
          {compactPeriodOptions.map((option) => (
            <Button
              key={option.id}
              variant={controller.view.id === option.id ? "default" : "outline"}
              size="sm"
              className="h-8 flex-1 rounded-full text-[12px] font-semibold uppercase tracking-[0.25em]"
              onClick={() => controller.setView(option.id)}
            >
              {option.days}d
            </Button>
          ))}
          <Button
            variant={controller.view.id === "custom" ? "default" : "outline"}
            size="sm"
            className="h-8 flex-[1.2] rounded-full text-[12px] font-semibold uppercase tracking-[0.25em]"
            onClick={() => controller.setView("custom")}
          >
            Custom
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-foreground hover:bg-muted"
            onClick={controller.goPrev}
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-foreground hover:bg-muted"
            onClick={controller.goToday}
            aria-label="Today"
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-foreground hover:bg-muted"
            onClick={controller.goNext}
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <CompactRangePicker
            value={controller.customRange}
            onChange={(range) => controller.setCustomRange(range)}
            onClear={() => controller.clearCustomRange()}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function GroupingButton({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border border-white/20 bg-slate-900/60 text-slate-100"
          aria-label="Group by"
        >
          <span className="text-xs font-semibold">G</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 space-y-1 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-lg" align="end">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="h-10 w-full rounded-xl">
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">General</SelectItem>
            <SelectItem value="manufacturer">Make</SelectItem>
            <SelectItem value="bodyStyle">Body type</SelectItem>
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  )
}

function SortButton({
  value,
  onValueChange,
}: {
  value: SortOption
  onValueChange: (value: SortOption) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border border-white/20 bg-slate-900/60 text-slate-100"
          aria-label="Sort"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 space-y-1 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-lg" align="end">
        <Select value={value} onValueChange={(v) => onValueChange(v as SortOption)}>
          <SelectTrigger className="h-10 w-full rounded-xl">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="utilization">Utilisation</SelectItem>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="name">Vehicle</SelectItem>
          </SelectContent>
        </Select>
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
  setPinnedVehicleId: (value: string | null) => void,
  setStageFilters: (value: Record<StageKey, boolean>) => void,
  setSortOption: (value: SortOption) => void
) {
  setLayerFilters({ reservation: true, rental: true, maintenance: true, repair: true })
  setStageFilters(createDefaultStageFilters())
  setSortOption("utilization")
  controller.clearCustomRange()
  controller.setGrouping("none")
  controller.setView("week")
  controller.goToday()
  setSearchQuery("")
  setPinnedVehicleId(null)
}

export function buildVehicleSearchLabel(vehicle: FleetCar) {
  const parts = [vehicle.name?.trim(), vehicle.plate?.trim()].filter(Boolean)
  return parts.join(" · ")
}

export function sortVehicles(a: FleetCar, b: FleetCar, option: SortOption, utilizationMap?: Map<string, number>) {
  if (option === "price") {
    const diff = (b.revenueYTD ?? 0) - (a.revenueYTD ?? 0)
    if (diff !== 0) return diff
  }
  if (option === "name") {
    return (a.name ?? "").localeCompare(b.name ?? "")
  }
  const utilA = utilizationMap?.get(String(a.id)) ?? a.utilization ?? 0
  const utilB = utilizationMap?.get(String(b.id)) ?? b.utilization ?? 0
  if (utilB !== utilA) return utilB - utilA
  // Тай-брейк: выше ревенью и затем название.
  const revenueDiff = (b.revenueYTD ?? 0) - (a.revenueYTD ?? 0)
  if (revenueDiff !== 0) return revenueDiff
  return (a.name ?? "").localeCompare(b.name ?? "")
}

function buildUtilizationMap(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date) {
  const map = new Map<string, number>()
  const rangeMs = Math.max(1, rangeEnd.getTime() - rangeStart.getTime())

  events.forEach((event) => {
    const carId = String(event.carId)
    const start = Math.max(rangeStart.getTime(), new Date(event.start).getTime())
    const end = Math.min(rangeEnd.getTime(), new Date(event.end).getTime())
    if (end <= start) return
    const duration = end - start
    map.set(carId, (map.get(carId) ?? 0) + duration)
  })

  Array.from(map.entries()).forEach(([carId, durationMs]) => {
    // Храним положительные проценты; сортировка использует utilB - utilA, поэтому большие значения окажутся выше.
    map.set(carId, Math.round((durationMs / rangeMs) * 100))
  })

  return map
}

function resolveStageKey(event: CalendarEvent): StageKey {
  const normalizedStage = event.stageLabel?.toLowerCase() ?? ""
  if (normalizedStage.includes("car with customer")) return "car_with_customer"
  if (normalizedStage.includes("pickup") || normalizedStage.includes("pick up")) return "pickup"
  if (normalizedStage.includes("delivery")) return "delivery"
  if (normalizedStage.includes("confirm")) return "confirmed"

  const normalizedStatus = (event.bookingStatus ?? "").toLowerCase()
  if (normalizedStatus.includes("confirm")) return "confirmed"
  if (normalizedStatus.includes("delivery")) return "delivery"
  if (normalizedStatus === "in-rent" || normalizedStatus === "in_rent" || normalizedStatus === "active") return "car_with_customer"
  if (normalizedStatus.includes("settlement") || normalizedStatus.includes("pickup") || normalizedStatus.includes("pick up")) return "pickup"
  return "other"
}
