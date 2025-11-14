"use client"

import { Fragment, useMemo } from "react"
import { CalendarClock, CarFront, ShieldAlert, Wrench } from "lucide-react"

import type { FleetCalendarController } from "@/components/fleet-calendar"
import { useFleetCalendarController } from "@/components/fleet-calendar"
import type { CalendarEvent, FleetCar, FleetCarStatus } from "@/lib/domain/entities"
import { calendarEventTypes } from "@/lib/constants/calendar"
import { DAY_IN_MS, buildVisibleDates, getStartOfToday } from "@/lib/fleet/calendar-grid"
import { cn } from "@/lib/utils"

import styles from "./fleet-calendar-v2.module.css"

export interface FleetCalendarBoardV2Props {
  controller?: FleetCalendarController
  vehicles: FleetCar[]
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
}

const statusToneClass: Record<FleetCarStatus, string> = {
  Available: styles.statusAvailable,
  "In Rent": styles.statusInRent,
  Maintenance: styles.statusMaintenance,
}

const eventTypeIcon = {
  reservation: CalendarClock,
  rental: CarFront,
  maintenance: Wrench,
  repair: ShieldAlert,
} as const

export function FleetCalendarBoardV2({ controller, vehicles, events, onEventClick }: FleetCalendarBoardV2Props) {
  const internalController = useFleetCalendarController()
  const { view, offset, grouping, baseDate } = controller ?? internalController

  const visibleDates = useMemo(() => buildVisibleDates(baseDate, offset, view.days), [baseDate, offset, view.days])
  const today = useMemo(() => getStartOfToday(), [])
  const gridTemplateColumns = useMemo(
    () => `repeat(${visibleDates.length}, minmax(var(--fleet-v2-slot-width, 72px), 1fr))`,
    [visibleDates.length]
  )

  const visibleEvents = useMemo(() => {
    if (visibleDates.length === 0) return []
    const rangeStart = new Date(
      visibleDates[0].getFullYear(),
      visibleDates[0].getMonth(),
      visibleDates[0].getDate()
    )
    const rangeEndExclusive = new Date(rangeStart.getTime() + visibleDates.length * DAY_IN_MS)
    return events.filter((event) => {
      const start = new Date(event.start)
      const end = new Date(event.end)
      return end > rangeStart && start < rangeEndExclusive
    })
  }, [events, visibleDates])

  const groupedRows = useMemo(() => {
    const map = new Map<string, { label: string; rows: { car: FleetCar; events: CalendarEvent[] }[] }>()

    const bodyStyleFor = (car: FleetCar) => car.bodyStyle?.trim() || "Unspecified"
    const brandNameFor = (car: FleetCar) => car.make?.trim() || car.name.split(" ")[0] || car.name
    const groupKeyFor = (car: FleetCar) => (grouping === "manufacturer" ? brandNameFor(car) : bodyStyleFor(car))
    const labelFor = (key: string) => (grouping === "manufacturer" ? `${key} · Manufacturer` : `${key} · Body style`)

    vehicles.forEach((car) => {
      const key = groupKeyFor(car)
      if (!map.has(key)) {
        map.set(key, { label: labelFor(key), rows: [] })
      }
      map.get(key)!.rows.push({
        car,
        events: visibleEvents
          .filter((event) => String(event.carId) === String(car.id))
          .sort((a, b) => a.start.localeCompare(b.start)),
      })
    })

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "en", { sensitivity: "base" }))
      .map(([, value]) => ({
        label: value.label,
        rows: value.rows.sort((a, b) => a.car.name.localeCompare(b.car.name, "en", { sensitivity: "base" })),
      }))
  }, [grouping, vehicles, visibleEvents])

  return (
    <div className={styles.board} data-testid="fleet-calendar-v2-board">
      <div className={styles.scrollArea}>
        <div className={styles.table} role="grid" aria-label="Fleet availability timeline">
          <div className={cn(styles.row, styles.headerRow)}>
            <div className={cn(styles.leftCell, styles.leftHeader)}>Vehicles</div>
            <div className={styles.rowGrid}>
              <div className={cn(styles.grid, styles.gridHeader)} style={{ gridTemplateColumns }}>
                {visibleDates.map((date) => (
                  <div
                    key={`header-${date.toISOString()}`}
                    className={cn(styles.dayHeader, isSameDay(date, today) && styles.dayIsToday)}
                    style={{ gridColumn: "span 2" }}
                  >
                    <span className={styles.dayPrimary}>
                      {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </span>
                    <span className={styles.daySecondary}>{date.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {groupedRows.map((group) => (
            <Fragment key={`group-${group.label}`}>
              <div className={cn(styles.row, styles.groupRow)}>
                <div className={cn(styles.leftCell, styles.groupCell)}>{group.label}</div>
                <div className={styles.rowGrid}>
                  <div className={styles.groupDivider} />
                </div>
              </div>

              {group.rows.map(({ car, events: carEvents }) => (
                <div key={`row-${group.label}-${car.id}`} className={styles.row}>
                  <div className={styles.leftCell}>
                    <div className={styles.vehicleTitle}>{car.name}</div>
                    <div className={styles.vehicleMeta}>
                      <span className={styles.vehiclePlate}>{car.plate}</span>
                      {car.make ? <span className={styles.vehicleMake}>{car.make}</span> : null}
                    </div>
                    <span className={cn(styles.statusBadge, statusToneClass[car.status])}>{car.status}</span>
                  </div>
                  <div className={styles.rowGrid}>
                  <CarRowTimeline
                      rowKey={`row-${group.label}-${car.id}`}
                      events={carEvents}
                      visibleDates={visibleDates}
                      gridTemplateColumns={gridTemplateColumns}
                      today={today}
                      onEventClick={onEventClick}
                    />
                  </div>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

function CarRowTimeline({
  events,
  visibleDates,
  gridTemplateColumns,
  rowKey,
  today,
  onEventClick,
}: {
  events: CalendarEvent[]
  visibleDates: Date[]
  gridTemplateColumns: string
  rowKey: string
  today: Date
  onEventClick?: (event: CalendarEvent) => void
}) {
  const { placements, laneCount } = useMemo(() => buildStackedPlacements(events, visibleDates), [events, visibleDates])

  return (
    <div className={cn(styles.grid, styles.gridBody)} style={{ gridTemplateColumns }}>
      {visibleDates.map((date) => (
        <div
          key={`${rowKey}-${date.toISOString()}`}
          className={cn(styles.dayCell, isSameDay(date, today) && styles.dayIsToday)}
          style={{ gridColumn: "span 1", gridRow: `1 / span ${laneCount}` }}
        />
      ))}
      {placements.map(({ event, startColumn, spanColumns, lane }) => {
        const meta = calendarEventTypes[event.type]
        return (
          <div
            key={`${rowKey}-event-${event.id}`}
            className={styles.eventWrapper}
            style={{
              gridColumnStart: startColumn + 1,
              gridColumnEnd: startColumn + spanColumns + 1,
              gridRowStart: lane + 1,
              gridRowEnd: lane + 2,
            }}
          >
            <button
              type="button"
              className={styles.eventButton}
              onClick={() => onEventClick?.(event)}
              aria-label={`${meta.label}: ${event.title}`}
            >
              <div className={cn(styles.eventCard, styles[`event-${event.type}`])}>
                <CalendarEventIcon type={event.type} />
                <div className={styles.eventContent}>
                  <p className={styles.eventTitle}>{event.title}</p>
                  {event.stageLabel ? <p className={styles.eventStage}>{event.stageLabel}</p> : null}
                  <p className={styles.eventMeta}>{formatEventWindow(event)}</p>
                </div>
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}

interface StackedPlacement {
  event: CalendarEvent
  startColumn: number
  spanColumns: number
  lane: number
}

function buildStackedPlacements(events: CalendarEvent[], visibleDates: Date[]) {
  if (!visibleDates.length) {
    return { placements: [] as StackedPlacement[], laneCount: 0 }
  }

  const rangeStart = new Date(
    visibleDates[0].getFullYear(),
    visibleDates[0].getMonth(),
    visibleDates[0].getDate()
  )
  const dayCount = visibleDates.length
  const rangeEnd = new Date(rangeStart.getTime() + dayCount * DAY_IN_MS)

  const normalized = events
    .map((event) => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      if (eventEnd <= rangeStart || eventStart >= rangeEnd) {
        return null
      }
      const clampedStart = eventStart < rangeStart ? rangeStart : eventStart
      const clampedEnd = eventEnd > rangeEnd ? rangeEnd : eventEnd

      const startOffset = Math.floor((clampedStart.getTime() - rangeStart.getTime()) / DAY_IN_MS)
      const endOffset = Math.ceil((clampedEnd.getTime() - rangeStart.getTime()) / DAY_IN_MS)
      const startColumn = Math.max(0, Math.min(dayCount - 1, startOffset))
      const endColumn = Math.max(startColumn + 1, Math.min(dayCount, endOffset))
      const spanColumns = Math.max(1, endColumn - startColumn)

      return {
        event,
        startColumn,
        spanColumns,
        clampedStart,
        clampedEnd,
      }
    })
    .filter((value): value is {
      event: CalendarEvent
      startColumn: number
      spanColumns: number
      clampedStart: Date
      clampedEnd: Date
    } => Boolean(value))
    .sort((a, b) => a.clampedStart.getTime() - b.clampedStart.getTime())

  const lanes: number[] = []
  const placements: StackedPlacement[] = []

  normalized.forEach((item) => {
    let laneIndex = 0
    for (; laneIndex < lanes.length; laneIndex += 1) {
      if (item.clampedStart.getTime() >= lanes[laneIndex]) {
        lanes[laneIndex] = item.clampedEnd.getTime()
        break
      }
    }
    if (laneIndex === lanes.length) {
      lanes.push(item.clampedEnd.getTime())
    }

    placements.push({
      event: item.event,
      startColumn: item.startColumn,
      spanColumns: item.spanColumns,
      lane: laneIndex,
    })
  })

  return { placements, laneCount: Math.max(lanes.length, 1) }
}

function CalendarEventIcon({ type }: { type: CalendarEvent["type"] }) {
  const Icon = eventTypeIcon[type]
  return (
    <span className={styles.eventIcon} aria-hidden="true">
      <Icon size={14} strokeWidth={2} />
    </span>
  )
}

function formatEventWindow(event: CalendarEvent) {
  const start = new Date(event.start)
  const end = new Date(event.end)
  const formatter = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

  return `${formatter.format(start)} → ${formatter.format(end)}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
