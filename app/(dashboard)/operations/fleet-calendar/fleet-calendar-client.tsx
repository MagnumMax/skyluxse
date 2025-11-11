"use client"

import { useMemo, useState } from "react"

import "./fleet-calendar.css"

import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { FleetCalendarBoard, calendarViewOptions, useFleetCalendarController } from "@/components/fleet-calendar"
import type { CalendarEvent, FleetCar } from "@/lib/domain/entities"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type CalendarLayer = "rental" | "maintenance" | "repair"

interface OperationsFleetCalendarClientProps {
  vehicles: FleetCar[]
  events: CalendarEvent[]
}

export function OperationsFleetCalendarClient({ vehicles, events }: OperationsFleetCalendarClientProps) {
  const metrics = useMemo(() => buildCalendarMetrics(vehicles, events), [vehicles, events])
  const calendarController = useFleetCalendarController()
  const [sortBy, setSortBy] = useState<string>("utilization")
  const [layerFilters, setLayerFilters] = useState<Record<CalendarLayer, boolean>>({
    rental: true,
    maintenance: true,
    repair: true,
  })
  const [searchQuery, setSearchQuery] = useState("")

  const filteredVehicles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return [...vehicles]
      .filter((vehicle) => {
        if (!query) return true
        const haystack = `${vehicle.name} ${vehicle.plate}`.toLowerCase()
        return haystack.includes(query)
      })
      .sort((a, b) => sortVehicles(a, b, sortBy))
  }, [searchQuery, sortBy, vehicles])

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
        <KpiCard label="Vehicles tracked" value={metrics.totalVehicles.toString()} helper="Across Ops fleet segments" />
        <KpiCard label="Avg utilisation" value={`${metrics.avgUtilization}%`} helper="Trailing 7 days" trend={`+${metrics.utilizationDelta}%`} />
        <KpiCard label="In maintenance" value={metrics.maintenanceVehicles.toString()} helper="Cars currently out of service" />
        <KpiCard label="Repair conflicts" value={metrics.repairEvents.toString()} helper="Events flagged in next 7 days" tone="text-rose-600" />
      </section>

      <section className="rounded-[26px] border border-border/70 bg-card/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Filters & sorting</p>
            <p className="text-sm text-muted-foreground">Control upcoming range, sorting priority, and layer visibility.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetFilters(setSortBy, setLayerFilters, calendarController, setSearchQuery)}
          >
            Reset
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex w-full flex-col gap-3 lg:flex-row">
            <div className="flex-1">
              <Label htmlFor="calendar-search" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Search
              </Label>
              <Input
                id="calendar-search"
                placeholder="Search car, plate, booking…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="calendar-sort" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Sort by
              </Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="calendar-sort">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utilization">Utilization</SelectItem>
                  <SelectItem value="class">Vehicle class</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {calendarViewOptions.map((option) => (
              <Button
                key={option.id}
                size="sm"
                variant={calendarController.view.id === option.id ? "default" : "outline"}
                onClick={() => {
                  calendarController.setView(option.id)
                }}
              >
                {option.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={calendarController.goPrev}>
              ← Prev
            </Button>
            <Button variant="ghost" size="sm" onClick={calendarController.goToday}>
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={calendarController.goNext}>
              Next →
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="calendar-grouping" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Group by
            </Label>
            <Select value={calendarController.grouping} onValueChange={(value) => calendarController.setGrouping(value as any)}>
              <SelectTrigger id="calendar-grouping">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bodyStyle">Body type</SelectItem>
                <SelectItem value="manufacturer">Make</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Object.keys(layerMeta).map((key) => {
            const layer = key as CalendarLayer
            const meta = layerMeta[layer]
            return (
              <label key={layer} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/60 p-3 text-sm">
                <Checkbox
                  checked={layerFilters[layer]}
                  onCheckedChange={(value) =>
                    setLayerFilters((prev) => ({ ...prev, [layer]: Boolean(value) }))
                  }
                />
                <div>
                  <p className="font-semibold text-foreground">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.countLabel(metrics)}</p>
                </div>
              </label>
            )
          })}
        </div>
      </section>

      <FleetCalendarBoard
        controller={calendarController}
        vehicles={filteredVehicles}
        events={filteredEvents}
        bookingRouteBase="/operations"
      />
    </DashboardPageShell>
  )
}

const layerMeta: Record<CalendarLayer, { label: string; countLabel: (metrics: CalendarMetrics) => string }> = {
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

type CalendarMetrics = ReturnType<typeof buildCalendarMetrics>

function buildCalendarMetrics(vehicles: FleetCar[], events: CalendarEvent[]) {
  const totalVehicles = vehicles.length
  const avgUtilization = Math.round(
    (vehicles.reduce((acc, car) => acc + (car.utilization ?? 0), 0) / Math.max(totalVehicles, 1)) * 100
  )
  const maintenanceVehicles = vehicles.filter((car) => car.status === "Maintenance").length
  const maintenanceEvents = events.filter((event) => event.type === "maintenance").length
  const repairEvents = events.filter((event) => event.type === "repair").length
  const activeRentals = events.filter((event) => event.type === "rental").length

  return {
    totalVehicles,
    avgUtilization: Number.isFinite(avgUtilization) ? avgUtilization : 0,
    utilizationDelta: 2,
    maintenanceVehicles,
    maintenanceEvents,
    repairEvents,
    activeRentals,
  }
}

function resetFilters(
  setSortBy: (value: string) => void,
  setLayerFilters: (value: Record<CalendarLayer, boolean>) => void,
  controller: ReturnType<typeof useFleetCalendarController>,
  setSearchQuery: (value: string) => void
) {
  setSortBy("utilization")
  setLayerFilters({ rental: true, maintenance: true, repair: true })
  controller.setView("week")
  controller.goToday()
  setSearchQuery("")
}

function sortVehicles(a: FleetCar, b: FleetCar, sortBy: string) {
  if (sortBy === "class") {
    return a.class.localeCompare(b.class)
  }
  if (sortBy === "status") {
    return a.status.localeCompare(b.status)
  }
  return (b.utilization ?? 0) - (a.utilization ?? 0)
}

function KpiCard({ label, value, helper, trend, tone }: { label: string; value: string; helper?: string; trend?: string; tone?: string }) {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/90">
      <CardContent className="space-y-1.5 p-4">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-2xl font-semibold text-foreground ${tone ?? ""}`}>{value}</p>
          {trend ? <span className="text-xs font-medium text-emerald-600">{trend}</span> : null}
        </div>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  )
}
