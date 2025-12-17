"use client"

import Link from "next/link"
import React, { useMemo, useState } from "react"
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
import { StageFilterPopover } from "@/components/stage-filter-popover"
import type { Booking, BookingStatus, CalendarEvent, FleetCar } from "@/lib/domain/entities"
import { calculateVehicleRuntimeMetrics } from "@/lib/fleet/runtime"
import { calendarEventTypes } from "@/lib/constants/calendar"
import {
  createDefaultBookingStageFilters,
  KOMMO_PIPELINE_STAGE_META,
  type BookingStageKey,
  type KommoPipelineStageId,
} from "@/lib/constants/bookings"
import { buildVisibleDates, DAY_IN_MS } from "@/lib/fleet/calendar-grid"
import { toDubaiDate } from "@/lib/formatters"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutDashboard,
  RotateCcw,
} from "lucide-react"
import type { DateRange } from "react-day-picker"

export type CalendarLayer = "reservation" | "rental" | "maintenance" | "repair"

type StageKey = BookingStageKey

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
  const calendarController = useFleetCalendarController("fortnight", "none")
  const sanitizedEvents = useMemo(
    () => events.filter((event) => !isLostCalendarEvent(event)),
    [events]
  )
  const metrics = useMemo(
    () => buildCalendarMetrics(vehicles, bookings, sanitizedEvents),
    [bookings, sanitizedEvents, vehicles]
  )
  const vehiclePriceMap = useMemo(() => buildVehiclePriceMap(bookings), [bookings])
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
  const [stageFilters, setStageFilters] = useState<Record<StageKey, boolean>>(() => createDefaultBookingStageFilters())
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
      ? new Date(
          visibleDates[visibleDates.length - 1].getFullYear(),
          visibleDates[visibleDates.length - 1].getMonth(),
          visibleDates[visibleDates.length - 1].getDate() + 1
        )
      : new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + calendarController.rangeDays)

    const filteredEvents = sanitizedEvents
      .filter((event) => {
        // Special handling for maintenance events - show if maintenance layer is enabled OR "Car with customer" stage is enabled
        const isMaintenanceEvent = event.type === "maintenance"
        const shouldShowMaintenance = layerFilters.maintenance || stageFilters["in-rent"]

        if (isMaintenanceEvent) {
          if (!shouldShowMaintenance) return false
        } else {
          if (!layerFilters[event.type as CalendarLayer]) return false
        }

        if (!visibleVehicleIds.has(String(event.carId))) return false

        const stageKey = resolveStageKey(event)

        // Skip stage filtering for maintenance events when shown due to "Car with customer"
        if (isMaintenanceEvent && stageFilters["in-rent"] && !layerFilters.maintenance) {
          // Maintenance shown due to "Car with customer" - skip stage filter
          return true
        }

        if (stageKey && !stageFilters[stageKey]) return false
        return true
      })
      .filter((event) => {
        const eventStart = toDubaiDate(event.start).getTime()
        const eventEnd = toDubaiDate(event.end).getTime()
        return eventEnd > rangeStart.getTime() && eventStart < rangeEnd.getTime()
      })

    const utilizationMap = buildUtilizationMap(filteredEvents, rangeStart, rangeEnd)
    const sorted = [...baseFiltered].sort((a, b) => sortVehicles(a, b, sortOption, utilizationMap, vehiclePriceMap))

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
    vehiclePriceMap,
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
  const compactPeriodOptions = calendarViewOptions.filter((option) => option.id === "fortnight" || option.id === "30-day")

  return (
    <DashboardHeaderSearch
      className="ml-4"
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
            asChild
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-white/20 bg-slate-900/60 text-slate-100"
            aria-label="Open bookings board"
            title="Open bookings board"
          >
            <Link href="/bookings">
              <LayoutDashboard className="h-4 w-4" />
            </Link>
          </Button>
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
  const monthDayFormatter = new Intl.DateTimeFormat("en-GB", { month: "short", day: "2-digit", timeZone: "Asia/Dubai" })
  const monthDayYearFormatter = new Intl.DateTimeFormat("en-GB", { month: "short", day: "2-digit", year: "numeric", timeZone: "Asia/Dubai" })
  const startLabel = (sameYear ? monthDayFormatter : monthDayYearFormatter).format(start)
  const endLabel = monthDayYearFormatter.format(end)
  return `${startLabel} → ${endLabel}`
}

export function resetFilters(
  setLayerFilters: (value: Record<CalendarLayer, boolean>) => void,
  controller: ReturnType<typeof useFleetCalendarController>,
  setSearchQuery: (value: string) => void,
  setPinnedVehicleId: (value: string | null) => void,
  setStageFilters: React.Dispatch<React.SetStateAction<Record<StageKey, boolean>>>,
  setSortOption: (value: SortOption) => void
) {
  setLayerFilters({ reservation: true, rental: true, maintenance: true, repair: true })
  setStageFilters(createDefaultBookingStageFilters())
  setSortOption("utilization")
  controller.clearCustomRange()
  controller.setGrouping("none")
  controller.setView("fortnight")
  controller.goToday()
  setSearchQuery("")
  setPinnedVehicleId(null)
}

export function buildVehicleSearchLabel(vehicle: FleetCar) {
  const parts = [vehicle.name?.trim(), vehicle.plate?.trim()].filter(Boolean)
  return parts.join(" · ")
}

function buildVehiclePriceMap(bookings: Booking[]) {
  const latestPriceByVehicle = new Map<string, { price: number; timestamp: number }>()

  bookings.forEach((booking) => {
    if (!booking.carId) return
    const price = resolveBookingDailyRate(booking)
    if (price == null) return

    const bookingTs = Date.parse(booking.startDate)
    const carId = String(booking.carId)
    const current = latestPriceByVehicle.get(carId)
    const normalizedTs = Number.isFinite(bookingTs) ? bookingTs : 0

    if (!current || normalizedTs > current.timestamp) {
      latestPriceByVehicle.set(carId, { price, timestamp: normalizedTs })
    }
  })

  const priceMap = new Map<string, number>()
  latestPriceByVehicle.forEach(({ price }, carId) => priceMap.set(carId, price))
  return priceMap
}

function resolveBookingDailyRate(booking: Booking) {
  const daily = booking.priceDaily
  if (Number.isFinite(daily)) return daily as number

  const total = booking.totalAmount
  if (!Number.isFinite(total)) return null

  const durationDays = booking.rentalDurationDays ?? computeBookingDurationDays(booking.startDate, booking.endDate)
  if (!Number.isFinite(durationDays) || (durationDays as number) <= 0) return null

  return total / (durationDays as number)
}

function computeBookingDurationDays(startDate: string, endDate: string) {
  const start = Date.parse(startDate)
  const end = Date.parse(endDate)
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  const diffMs = end - start
  if (diffMs <= 0) return null
  return Math.max(1, Math.ceil(diffMs / DAY_IN_MS))
}

export function sortVehicles(
  a: FleetCar,
  b: FleetCar,
  option: SortOption,
  utilizationMap?: Map<string, number>,
  priceMap?: Map<string, number>
) {
  if (option === "price") {
    const priceA = priceMap?.get(String(a.id)) ?? 0
    const priceB = priceMap?.get(String(b.id)) ?? 0
    if (priceB !== priceA) return priceB - priceA
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
  if (event.type === "maintenance") {
    return "in-rent"
  }
  const kommoId = event.kommoStatusId ? String(event.kommoStatusId) : null
  if (!kommoId) return "other"

  switch (kommoId) {
    case "75440391": // Confirmed Bookings
      return "confirmed"
    case "75440395": // Delivery Within 24 Hours
      return "delivery"
    case "75440399": // Car with Customers
      return "in-rent"
    case "76475495": // Pick Up Within 24 Hours
      return "pickup"
    case "142": // Closed · Won
    case "75440643": // Refund Deposit
    case "78486287": // Objections
      return "closed"
    case "96150292": // Waiting for Payment
    default:
      return "other"
  }
}
