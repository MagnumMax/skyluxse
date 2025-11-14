"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, RefreshCcw, Search } from "lucide-react"

import { FleetCalendarBoardV2 } from "@/components/fleet-calendar-v2"
import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { calendarViewOptions, useFleetCalendarController } from "@/components/fleet-calendar"
import type { Booking, CalendarEvent, FleetCar } from "@/lib/domain/entities"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type CalendarLayer,
  EVENT_LAYER_ORDER,
  KpiCard,
  buildCalendarMetrics,
  buildVehicleSearchLabel,
  layerMeta,
  resetFilters,
  sortVehicles,
} from "./fleet-calendar-client"

interface FleetCalendarV2ClientProps {
  vehicles: FleetCar[]
  bookings: Booking[]
  events: CalendarEvent[]
  initialVehicleId?: string | null
}

export function FleetCalendarV2Client({ vehicles, bookings, events, initialVehicleId }: FleetCalendarV2ClientProps) {
  const router = useRouter()
  const calendarController = useFleetCalendarController()
  const metrics = useMemo(() => buildCalendarMetrics(vehicles, bookings, events), [vehicles, bookings, events])
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
    return sorted.filter((vehicle) => `${vehicle.name} ${vehicle.plate}`.toLowerCase().includes(query))
  }, [pinnedVehicleId, searchQuery, vehicles])

  const visibleVehicleIds = useMemo(() => new Set(filteredVehicles.map((vehicle) => String(vehicle.id))), [filteredVehicles])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!layerFilters[event.type as CalendarLayer]) return false
      return visibleVehicleIds.has(String(event.carId))
    })
  }, [events, layerFilters, visibleVehicleIds])

  return (
    <DashboardPageShell>
      <div className="space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.32em] text-muted-foreground">Beta</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Fleet calendar v2</h1>
              <p className="text-sm text-muted-foreground">Experimental assignment board with Fleetio-inspired layout.</p>
            </div>
            <Button variant="outline" className="rounded-full border-dashed" size="sm">
              Share feedback
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Vehicles tracked" value={metrics.totalVehicles.toString()} />
          <KpiCard label="Avg utilisation (30D)" value={`${metrics.avgUtilization}%`} />
          <KpiCard label="In maintenance" value={metrics.maintenanceVehicles.toString()} />
          <KpiCard label="Repair conflicts" value={metrics.repairEvents.toString()} tone="text-rose-600" />
        </section>

        <FleetCalendarV2Header
          controller={calendarController}
          layerFilters={layerFilters}
          metrics={metrics}
          onToggleLayer={(layer) => setLayerFilters((prev) => ({ ...prev, [layer]: !prev[layer] }))}
          onReset={() => resetFilters(setLayerFilters, calendarController, setSearchQuery, setPinnedVehicleId)}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />

        <FleetCalendarBoardV2
          controller={calendarController}
          vehicles={filteredVehicles}
          events={filteredEvents}
          onEventClick={(event) => {
            if (!event.bookingId) return
            const bookingId = String(event.bookingId)
            router.push(`/bookings/${bookingId}?view=operations`)
          }}
        />
      </div>
    </DashboardPageShell>
  )
}

function FleetCalendarV2Header({
  controller,
  layerFilters,
  metrics,
  onToggleLayer,
  onReset,
  searchQuery,
  onSearchChange,
}: {
  controller: ReturnType<typeof useFleetCalendarController>
  layerFilters: Record<CalendarLayer, boolean>
  metrics: ReturnType<typeof buildCalendarMetrics>
  onToggleLayer: (layer: CalendarLayer) => void
  onReset: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
}) {
  const activeLayers = EVENT_LAYER_ORDER.filter((layer) => layerFilters[layer]).length

  return (
    <Card className="rounded-[28px] border border-border/70 bg-card/90 shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Range</Label>
            <Tabs
              value={controller.view.id}
              onValueChange={(value) =>
                controller.setView((value as (typeof calendarViewOptions)[number]["id"]) ?? controller.view.id)
              }
              className="w-full"
            >
              <TabsList className="flex w-full flex-wrap gap-2 bg-transparent p-0">
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
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-border/70 bg-background/60 px-2 py-1">
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

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <Label htmlFor="calendar-v2-search" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Search
            </Label>
            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                id="calendar-v2-search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search car, plate, booking…"
                className="border-none bg-transparent p-0 text-sm focus-visible:ring-0"
              />
              {searchQuery ? (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSearchChange("")}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:w-auto">
            {EVENT_LAYER_ORDER.map((layer) => (
              <LayerChip
                key={layer}
                layer={layer}
                metrics={metrics}
                active={layerFilters[layer]}
                onToggle={() => onToggleLayer(layer)}
              />
            ))}
          </div>
          <div className="w-full min-[480px]:w-64">
            <Label htmlFor="calendar-v2-grouping" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Group by
            </Label>
            <Select value={controller.grouping} onValueChange={(value) => controller.setGrouping(value as any)}>
              <SelectTrigger id="calendar-v2-grouping" className="mt-1">
                <SelectValue placeholder="Grouping" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bodyStyle">Body type</SelectItem>
                <SelectItem value="manufacturer">Manufacturer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <FleetCalendarLegend />
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Layers active {activeLayers}/{EVENT_LAYER_ORDER.length}</span>
            <Button variant="ghost" size="sm" onClick={onReset} className="rounded-full">
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const layerTone = {
  reservation: {
    surface: "var(--fleet-calendar-reservation-surface)",
    border: "var(--fleet-calendar-reservation-border)",
  },
  rental: {
    surface: "var(--fleet-calendar-rental-surface)",
    border: "var(--fleet-calendar-rental-border)",
  },
  maintenance: {
    surface: "var(--fleet-calendar-maintenance-surface)",
    border: "var(--fleet-calendar-maintenance-border)",
  },
  repair: {
    surface: "var(--fleet-calendar-repair-surface)",
    border: "var(--fleet-calendar-repair-border)",
  },
} satisfies Record<CalendarLayer, { surface: string; border: string }>

function LayerChip({
  layer,
  metrics,
  active,
  onToggle,
}: {
  layer: CalendarLayer
  metrics: ReturnType<typeof buildCalendarMetrics>
  active: boolean
  onToggle: () => void
}) {
  const meta = layerMeta[layer]
  const tones = layerTone[layer]
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] transition-colors ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"
      }`}
    >
      <span
        className="h-2.5 w-2.5 rounded-full border"
        style={{ backgroundColor: tones.surface, borderColor: tones.border }}
      />
      <span>{meta.label}</span>
      <span className="text-[0.6rem] font-normal text-muted-foreground">{meta.countLabel(metrics)}</span>
    </button>
  )
}

function FleetCalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {EVENT_LAYER_ORDER.map((layer) => {
        const tones = layerTone[layer]
        const meta = layerMeta[layer]
        return (
          <div key={`legend-${layer}`} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full border"
              style={{ backgroundColor: tones.surface, borderColor: tones.border }}
            />
            <span className="font-medium text-foreground">{meta.label}</span>
          </div>
        )
      })}
    </div>
  )
}
