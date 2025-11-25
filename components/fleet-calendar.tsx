"use client"

import { Fragment, useCallback, useMemo, useState } from "react"

import type { CalendarEvent, CalendarEventType, FleetCar } from "@/lib/domain/entities"
import { calendarEventTypes } from "@/lib/constants/calendar"
import {
  DAY_IN_MS,
  buildVisibleDates,
  getEventGridPlacement,
  getStartOfToday,
} from "@/lib/fleet/calendar-grid"
import type { EventPlacement } from "@/lib/fleet/calendar-grid"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"

function normalizeDate(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export const calendarViewOptions = [
  { id: "3-day", label: "3 days", days: 3 },
  { id: "week", label: "Week", days: 7 },
  { id: "fortnight", label: "14 days", days: 14 },
  { id: "30-day", label: "30 days", days: 30 },
  { id: "90-day", label: "90 days", days: 90 },
  { id: "custom", label: "Custom", days: 7 },
] as const

type CalendarViewOption = (typeof calendarViewOptions)[number]

export type FleetCalendarController = ReturnType<typeof useFleetCalendarController>
type GroupBy = "bodyStyle" | "manufacturer"

export function useFleetCalendarController(initialViewId: CalendarViewOption["id"] = "week") {
  const fallback = calendarViewOptions.find((option) => option.id === initialViewId) ?? calendarViewOptions[1]
  const customDefaultDays = calendarViewOptions.find((option) => option.id === "custom")?.days ?? 7
  const [viewId, setViewId] = useState<CalendarViewOption["id"]>(fallback.id)
  const [offset, setOffset] = useState(0)
  const [grouping, setGrouping] = useState<GroupBy>("bodyStyle")
  const [baseDate, setBaseDate] = useState(() => getStartOfToday())
  const [customRange, setCustomRangeState] = useState<DateRange | null>(null)
  const [lastPresetViewId, setLastPresetViewId] = useState<CalendarViewOption["id"]>(
    fallback.id === "custom" ? calendarViewOptions[1].id : fallback.id
  )

  const customRangeDays = useMemo(() => {
    if (!customRange?.from) return null
    const start = normalizeDate(customRange.from)
    const end = normalizeDate(customRange.to ?? customRange.from)
    const rangeLength = Math.floor((end.getTime() - start.getTime()) / DAY_IN_MS) + 1
    return Math.max(1, rangeLength)
  }, [customRange])

  const view = useMemo(() => {
    const option = calendarViewOptions.find((candidate) => candidate.id === viewId) ?? calendarViewOptions[1]
    if (viewId === "custom" && customRangeDays) {
      return { ...option, days: customRangeDays }
    }
    return option
  }, [customRangeDays, viewId])
  const rangeDays = customRangeDays ?? view.days

  const setView = (nextId: CalendarViewOption["id"]) => {
    setViewId(nextId)
    setOffset(0)
    if (nextId === "custom") {
      if (!customRange) {
        const today = getStartOfToday()
        const defaultEnd = new Date(today.getTime() + (customDefaultDays - 1) * DAY_IN_MS)
        setCustomRangeState({ from: today, to: defaultEnd })
        setBaseDate(today)
      }
      return
    }
    setCustomRangeState(null)
    setLastPresetViewId(nextId)
  }

  const goPrev = () => setOffset((value) => value - rangeDays)
  const goNext = () => setOffset((value) => value + rangeDays)
  const goToday = () => {
    const today = getStartOfToday()
    setBaseDate(today)
    setOffset(0)
    if (customRangeDays) {
      const updatedEnd = new Date(today.getTime() + (customRangeDays - 1) * DAY_IN_MS)
      setCustomRangeState({ from: today, to: updatedEnd })
      setViewId("custom")
    }
  }

  const setCustomRange = (range: DateRange | null) => {
    if (!range?.from || !range.to) return
    const start = normalizeDate(range.from)
    const end = normalizeDate(range.to)
    const [from, to] = start.getTime() <= end.getTime() ? [start, end] : [end, start]
    setCustomRangeState({ from, to })
    setBaseDate(from)
    setOffset(0)
    setViewId("custom")
  }

  const clearCustomRange = () => {
    setCustomRangeState(null)
    setViewId(lastPresetViewId)
    setOffset(0)
    const today = getStartOfToday()
    setBaseDate(today)
  }

  return {
    view,
    setView,
    offset,
    setOffset,
    goPrev,
    goNext,
    goToday,
    grouping,
    setGrouping,
    baseDate,
    customRange,
    setCustomRange,
    clearCustomRange,
    rangeDays,
  }
}

export interface FleetCalendarBoardProps {
  controller?: FleetCalendarController
  vehicles: FleetCar[]
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
}

export function FleetCalendarBoard({
  controller,
  vehicles,
  events,
  onEventClick,
}: FleetCalendarBoardProps) {
  const internalController = useFleetCalendarController()
  const { view, setView, offset, setOffset, grouping, baseDate, rangeDays } = controller ?? internalController
  const combinedEvents = useMemo(() => [...events], [events])

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      if (onEventClick) {
        onEventClick(event)
      }
    },
    [onEventClick]
  )

  // Рассчитываем из контроллера (baseDate + offset + view.days).
  const visibleDates = useMemo(
    () => buildVisibleDates(baseDate, offset, rangeDays),
    [baseDate, offset, rangeDays]
  )

  const visibleEvents = useMemo(() => {
    if (visibleDates.length === 0) {
      return []
    }

    const rangeStart = new Date(
      visibleDates[0].getFullYear(),
      visibleDates[0].getMonth(),
      visibleDates[0].getDate()
    )
    const rangeEndExclusive = new Date(rangeStart.getTime() + visibleDates.length * DAY_IN_MS)

    return combinedEvents.filter((event) => {
      const start = new Date(event.start)
      const end = new Date(event.end)
      return end > rangeStart && start < rangeEndExclusive
    })
  }, [combinedEvents, visibleDates])

  const groupedRows = useMemo(() => {
    const bodyStyleFor = (car: FleetCar) => car.bodyStyle?.trim() || "Unspecified"
    const brandNameFor = (car: FleetCar) => car.make?.trim() || car.name.split(" ")[0] || car.name
    const groupKeyFor = (car: FleetCar) =>
      grouping === "manufacturer" ? brandNameFor(car) : bodyStyleFor(car)
    const labelFor = (key: string) =>
      grouping === "manufacturer" ? `${key} · Make` : `${key} · Body type`

    const map = new Map<string, { label: string; rows: { car: FleetCar; events: CalendarEvent[] }[] }>()
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

    return Array.from(map.values())
      .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }))
      .map((group) => ({
        ...group,
        rows: [...group.rows].sort((a, b) =>
          brandNameFor(a.car).localeCompare(brandNameFor(b.car), "en", { sensitivity: "base" })
        ),
      }))
  }, [grouping, vehicles, visibleEvents])

  const gridTemplateColumns = useMemo(
    () => `repeat(${visibleDates.length * 2}, minmax(65px, 1fr))`,
    [visibleDates.length]
  )

  // "Сегодня" по локальному времени браузера (нормализовано до дня).
  const today = useMemo(() => getStartOfToday(), [])

  // Индекс столбца для "сегодня", если он в пределах видимого диапазона. Иначе -1.
  const todayColumnIndex = useMemo(() => {
    if (visibleDates.length === 0) return -1
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const index = visibleDates.findIndex((date) => {
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      return dateStart === todayStart
    })
    return index === -1 ? -1 : index
  }, [today, visibleDates])

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
                  className="calendar-day-header"
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
                    gridTemplateColumns={gridTemplateColumns}
                    rowKey={`row-${group.label}-${car.id}`}
                    onEventClick={handleEventClick}
                    todayColumnIndex={todayColumnIndex}
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
  gridTemplateColumns,
  rowKey,
  onEventClick,
  todayColumnIndex,
}: {
  events: CalendarEvent[]
  visibleDates: Date[]
  gridTemplateColumns: string
  rowKey: string
  onEventClick?: (event: CalendarEvent) => void
  todayColumnIndex: number
}) {
  const placements = useMemo(() => {
    return events
      .map((event) => {
        const placement = getEventGridPlacement(event, visibleDates)
        return placement ? { event, placement } : null
      })
      .filter((item): item is { event: CalendarEvent; placement: EventPlacement } => Boolean(item))
  }, [events, visibleDates])

  return (
    <div className="calendar-grid fleet-calendar-grid-body" style={{ gridTemplateColumns }}>
      {visibleDates.map((date) => (
        <div
          key={`${rowKey}-${date.toISOString()}`}
          className="calendar-day-cell"
          style={{ gridColumn: "span 2", gridRow: "1 / 2" }}
        />
      ))}
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
        {event.stageLabel ? <div className="calendar-event-stage">{event.stageLabel}</div> : null}
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
