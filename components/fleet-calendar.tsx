"use client"

import { Fragment, useMemo, useState } from "react"

import type { CalendarEvent, CalendarEventType, FleetCar } from "@/lib/domain/entities"
import { calendarEventTypes } from "@/lib/constants/calendar"
import { cn } from "@/lib/utils"

const DAY_IN_MS = 86400000
const HALF_DAY_IN_MS = DAY_IN_MS / 2

function getStartOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export const calendarViewOptions = [
  { id: "3-day", label: "3 days", days: 3 },
  { id: "week", label: "Week", days: 7 },
  { id: "fortnight", label: "14 days", days: 14 },
] as const

type CalendarViewOption = (typeof calendarViewOptions)[number]

export type FleetCalendarController = ReturnType<typeof useFleetCalendarController>
type GroupBy = "class" | "manufacturer"

export function useFleetCalendarController(initialViewId: CalendarViewOption["id"] = "week") {
  const fallback = calendarViewOptions.find((option) => option.id === initialViewId) ?? calendarViewOptions[1]
  const [viewId, setViewId] = useState<CalendarViewOption["id"]>(fallback.id)
  const [offset, setOffset] = useState(0)
  const [grouping, setGrouping] = useState<GroupBy>("class")
  const [baseDate, setBaseDate] = useState(() => getStartOfToday())

  const view = useMemo(() => {
    return calendarViewOptions.find((option) => option.id === viewId) ?? calendarViewOptions[1]
  }, [viewId])

  const setView = (nextId: CalendarViewOption["id"]) => {
    setViewId(nextId)
    setOffset(0)
  }

  const goPrev = () => setOffset((value) => value - view.days)
  const goNext = () => setOffset((value) => value + view.days)
  const goToday = () => {
    setBaseDate(getStartOfToday())
    setOffset(0)
  }

  return { view, setView, offset, setOffset, goPrev, goNext, goToday, grouping, setGrouping, baseDate }
}

export function FleetCalendarBoard({
  controller,
  vehicles,
  events,
  onEventClick,
}: {
  controller?: FleetCalendarController
  vehicles: FleetCar[]
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
}) {
  const internalController = useFleetCalendarController()
  const { view, setView, offset, setOffset, grouping, baseDate } = controller ?? internalController
  const combinedEvents = useMemo(() => [...events], [events])

  const rangeStart = useMemo(() => new Date(baseDate.getTime() + offset * DAY_IN_MS), [baseDate, offset])
  const visibleDates = useMemo(
    () => Array.from({ length: view.days }, (_, index) => new Date(rangeStart.getTime() + index * DAY_IN_MS)),
    [rangeStart, view.days]
  )
  const rangeEndExclusive = useMemo(
    () => new Date(rangeStart.getTime() + view.days * DAY_IN_MS),
    [rangeStart, view.days]
  )

  const visibleEvents = useMemo(
    () =>
      combinedEvents.filter((event) => {
        const start = new Date(event.start)
        const end = new Date(event.end)
        return end > rangeStart && start < rangeEndExclusive
      }),
    [combinedEvents, rangeStart, rangeEndExclusive]
  )

  const groupedRows = useMemo(() => {
    const orderedCars = [...vehicles].sort((a, b) => {
      if (grouping === "manufacturer") {
        return a.name.localeCompare(b.name)
      }
      return a.class.localeCompare(b.class)
    })

    const map = new Map<string, { label: string; rows: { car: FleetCar; events: CalendarEvent[] }[] }>()
    orderedCars.forEach((car) => {
      const key = grouping === "manufacturer" ? car.name.split(" ")[0] ?? car.name : car.class
      const label = grouping === "manufacturer" ? `${key} · Make` : `${key} · Class`
      if (!map.has(key)) {
        map.set(key, { label, rows: [] })
      }
      map.get(key)!.rows.push({
        car,
        events: visibleEvents
          .filter((event) => String(event.carId) === String(car.id))
          .sort((a, b) => a.start.localeCompare(b.start)),
      })
    })
    return Array.from(map.values())
  }, [grouping, vehicles, visibleEvents])

  const gridTemplateColumns = useMemo(
    () => `repeat(${visibleDates.length * 2}, minmax(140px, 1fr))`,
    [visibleDates.length]
  )

  return (
    <div className="fleet-calendar-shell">
      <div className="fleet-calendar-table calendar-grid-scroll">
        <div className="fleet-calendar-table-row fleet-calendar-table-row--header">
          <div className="fleet-calendar-left-cell fleet-calendar-left-cell--header">Vehicles</div>
          <div className="fleet-calendar-row-grid">
            <div className="calendar-grid fleet-calendar-grid-header" style={{ gridTemplateColumns }}>
              {visibleDates.map((date) => (
                <div
                  key={`header-${date.toISOString()}`}
                  className={cn("calendar-day-header", isSameDay(date, baseDate) && "calendar-day-header-today")}
                  style={{ gridColumn: "span 2" }}
                >
                  {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </div>
              ))}
            </div>
          </div>
        </div>
        {groupedRows.map((group) => (
          <Fragment key={`group-${group.label}`}>
            <div className="fleet-calendar-table-row fleet-calendar-table-row--group">
              <div className="fleet-calendar-left-cell fleet-calendar-left-cell--group">{group.label}</div>
              <div className="fleet-calendar-row-grid">
                <div className="fleet-calendar-group-divider" />
              </div>
            </div>
            {group.rows.map(({ car, events }) => (
              <div key={`row-${group.label}-${car.id}`} className="fleet-calendar-table-row">
                <div className="fleet-calendar-left-cell">
                  <p className="fleet-calendar-car-title">{car.name}</p>
                  <p className="fleet-calendar-car-meta">{car.plate}</p>
                </div>
                <div className="fleet-calendar-row-grid">
                  <CarRowRight
                    events={events}
                    visibleDates={visibleDates}
                    baseDate={baseDate}
                    gridTemplateColumns={gridTemplateColumns}
                    rowKey={`row-${group.label}-${car.id}`}
                    onEventClick={onEventClick}
                  />
                </div>
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function CarRowRight({
  events,
  visibleDates,
  baseDate,
  gridTemplateColumns,
  rowKey,
  onEventClick,
}: {
  events: CalendarEvent[]
  visibleDates: Date[]
  baseDate: Date
  gridTemplateColumns: string
  rowKey: string
  onEventClick?: (event: CalendarEvent) => void
}) {
  const placements = useMemo(() => {
    return events
      .map((event) => {
        const placement = getEventGridPlacement(event, visibleDates)
        return placement ? { event, placement } : null
      })
      .filter(Boolean) as { event: CalendarEvent; placement: ReturnType<typeof getEventGridPlacement> }[]
  }, [events, visibleDates])

  return (
    <div className="calendar-grid fleet-calendar-grid-body" style={{ gridTemplateColumns }}>
      {visibleDates.map((date) => {
        const isToday = isSameDay(date, baseDate)
        return (
          <div
            key={`${rowKey}-${date.toISOString()}`}
            className={cn("calendar-day-cell", isToday && "calendar-day-cell-today")}
            style={{ gridColumn: "span 2", gridRow: "1 / 2" }}
          />
        )
      })}
      {placements.map(({ event, placement }) => (
        <div
          key={`${rowKey}-event-${event.id}`}
          className="calendar-event-wrapper"
          style={{
            gridColumnStart: placement.startSlot + 1,
            gridColumnEnd: placement.startSlot + placement.spanSlots + 1,
            gridRow: "1 / 2",
          }}
        >
          <CalendarEventPill event={event} onClick={onEventClick} />
        </div>
      ))}
    </div>
  )
}

function getEventGridPlacement(event: CalendarEvent, visibleDates: Date[]) {
  if (visibleDates.length === 0) {
    return null
  }
  const rangeStart = new Date(visibleDates[0].getFullYear(), visibleDates[0].getMonth(), visibleDates[0].getDate())
  const rangeEnd = new Date(rangeStart.getTime() + visibleDates.length * DAY_IN_MS)
  const eventStart = new Date(event.start)
  const eventEnd = new Date(event.end)
  const clampedStart = eventStart < rangeStart ? rangeStart : eventStart
  const clampedEnd = eventEnd > rangeEnd ? rangeEnd : eventEnd
  if (clampedEnd <= rangeStart || clampedStart >= rangeEnd) {
    return null
  }
  const slotCount = visibleDates.length * 2
  const startSlot = Math.max(
    0,
    Math.min(slotCount - 1, Math.floor((clampedStart.getTime() - rangeStart.getTime()) / HALF_DAY_IN_MS))
  )
  const rawEndSlot = Math.ceil((clampedEnd.getTime() - rangeStart.getTime()) / HALF_DAY_IN_MS)
  const endSlot = Math.max(startSlot + 1, Math.min(slotCount, rawEndSlot))
  const spanSlots = Math.max(1, endSlot - startSlot)
  return { startSlot, spanSlots }
}

function CalendarEventPill({
  event,
  onClick,
}: {
  event: CalendarEvent
  onClick?: (event: CalendarEvent) => void
}) {
  const meta = calendarEventTypes[event.type]
  const start = new Date(event.start)
  const end = new Date(event.end)

  return (
    <button type="button" onClick={() => onClick?.(event)} className="calendar-event-button">
      <div className={cn("calendar-event", meta.surface, meta.border)}>
        <div className="calendar-event-title">{event.title}</div>
        <div className="calendar-event-meta">
          {start.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" → "}
          {end.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </button>
  )
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
