"use client"

import { Fragment, useCallback, useMemo, useRef, useState } from "react"

import type { CalendarEvent, CalendarEventType, FleetCar } from "@/lib/domain/entities"
import { calendarEventTypes, getCalendarBookingStatusTone } from "@/lib/constants/calendar"
import {
  DAY_IN_MS,
  HALF_DAY_IN_MS,
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

export function isLostCalendarEvent(event: CalendarEvent) {
  const normalizedStatus = event.bookingStatus ? String(event.bookingStatus).trim().toLowerCase() : ""
  if (normalizedStatus === "lost") return true
  const normalizedStage = event.stageLabel?.toLowerCase() ?? ""
  return normalizedStage.includes("lost")
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
  onEventUpdate?: (eventId: CalendarEvent["id"], nextStart: Date, nextEnd: Date) => void
}

export function FleetCalendarBoard({
  controller,
  vehicles,
  events,
  onEventClick,
  onEventUpdate,
}: FleetCalendarBoardProps) {
  const internalController = useFleetCalendarController()
  const { view, setView, offset, setOffset, grouping, baseDate, rangeDays } = controller ?? internalController
  const [eventAdjustments, setEventAdjustments] = useState<Map<string, { start: string; end: string }>>(
    () => new Map()
  )

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

  const shouldHideEvent = useCallback((event: CalendarEvent) => isLostCalendarEvent(event), [])

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

    return events.filter((event) => {
      if (shouldHideEvent(event)) return false
      const start = new Date(event.start)
      const end = new Date(event.end)
      return end > rangeStart && start < rangeEndExclusive
    })
  }, [events, shouldHideEvent, visibleDates])

  const interactiveEvents = useMemo(() => {
    if (!eventAdjustments.size) return visibleEvents
    return visibleEvents.map((event) => {
      const adjustment = eventAdjustments.get(String(event.id))
      if (!adjustment) return event
      return { ...event, start: adjustment.start, end: adjustment.end }
    })
  }, [eventAdjustments, visibleEvents])

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

  const isWeekend = useCallback((date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }, [])

  const monthSegments = useMemo(() => {
    if (visibleDates.length === 0) return []
    const segments: { key: string; spanSlots: number; label: string; quarter: string }[] = []
    let startIndex = 0
    let currentMonth = visibleDates[0].getMonth()
    let currentYear = visibleDates[0].getFullYear()
    const pushSegment = (endIndex: number) => {
      const spanDays = endIndex - startIndex + 1
      const spanSlots = Math.max(1, spanDays * 2)
      const date = new Date(currentYear, currentMonth, 1)
      const label = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
      const quarter = `Q${Math.floor(currentMonth / 3) + 1}`
      segments.push({
        key: `${currentYear}-${currentMonth}`,
        spanSlots,
        label,
        quarter,
      })
    }
    visibleDates.forEach((date, index) => {
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
        pushSegment(index - 1)
        startIndex = index
        currentMonth = date.getMonth()
        currentYear = date.getFullYear()
      }
    })
    pushSegment(visibleDates.length - 1)
    return segments
  }, [visibleDates])

  const handleLocalEventUpdate = useCallback(
    (eventId: CalendarEvent["id"], nextStart: Date, nextEnd: Date) => {
      setEventAdjustments((prev) => {
        const next = new Map(prev)
        next.set(String(eventId), { start: nextStart.toISOString(), end: nextEnd.toISOString() })
        return next
      })
      onEventUpdate?.(eventId, nextStart, nextEnd)
    },
    [onEventUpdate]
  )

  return (
    <div className="fleet-calendar-shell">
      <div className="fleet-calendar-table">
        <div className="fleet-calendar-right-content">
          <div className="fleet-calendar-right-content-inner">
            <div className="fleet-calendar-table-row fleet-calendar-table-row--header">
              <div className="fleet-calendar-left-sidebar">
                <div className="fleet-calendar-left-cell fleet-calendar-left-cell--header">Vehicles</div>
              </div>
              <div className="fleet-calendar-row-grid">
                {monthSegments.length ? (
                  <div className="fleet-calendar-month-bar">
                    <div className="calendar-grid" style={{ gridTemplateColumns }}>
                      {monthSegments.map((segment) => (
                        <div
                          key={segment.key}
                          className="fleet-calendar-month-segment"
                          style={{ gridColumn: `span ${segment.spanSlots}` }}
                        >
                          <span className="fleet-calendar-month-segment-label">{segment.label}</span>
                          <span className="fleet-calendar-month-segment-quarter">{segment.quarter}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="calendar-grid fleet-calendar-grid-header" style={{ gridTemplateColumns }}>
                  {visibleDates.map((date) => (
                    <div
                      key={`header-${date.toISOString()}`}
                      className={cn("calendar-day-header", {
                        "calendar-day-header--weekend": isWeekend(date),
                        "calendar-day-header--today": todayColumnIndex !== -1 && visibleDates[todayColumnIndex]?.toDateString() === date.toDateString(),
                      })}
                      style={{ gridColumn: "span 2" }}
                    >
                      {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="fleet-calendar-scroll-body">
              {groupedRows.map((group) => (
                <Fragment key={`group-${group.label}`}>
                  <div className="fleet-calendar-table-row fleet-calendar-table-row--group">
                    <div className="fleet-calendar-left-sidebar">
                      <div className="fleet-calendar-left-cell fleet-calendar-left-cell--group">{group.label}</div>
                    </div>
                    <div className="fleet-calendar-row-grid">
                      <div className="fleet-calendar-group-divider" />
                    </div>
                  </div>
                  {group.rows.map(({ car, events }) => (
                    <div key={`row-${group.label}-${car.id}`} className="fleet-calendar-table-row">
                      <div className="fleet-calendar-left-sidebar">
                        <div className="fleet-calendar-left-cell">
                          <p className="fleet-calendar-car-title">{car.name}</p>
                          <p className="fleet-calendar-car-meta">{car.plate}</p>
                        </div>
                      </div>
                      <div className="fleet-calendar-row-grid">
                        <CarRowRight
                          events={events}
                          visibleDates={visibleDates}
                          gridTemplateColumns={gridTemplateColumns}
                          rowKey={`row-${group.label}-${car.id}`}
                          onEventClick={handleEventClick}
                          todayColumnIndex={todayColumnIndex}
                          isWeekend={isWeekend}
                          onEventUpdate={onEventUpdate ? handleLocalEventUpdate : undefined}
                        />
                      </div>
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
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
  isWeekend,
  onEventUpdate,
}: {
  events: CalendarEvent[]
  visibleDates: Date[]
  gridTemplateColumns: string
  rowKey: string
  onEventClick?: (event: CalendarEvent) => void
  todayColumnIndex: number
  isWeekend: (date: Date) => boolean
  onEventUpdate?: (eventId: CalendarEvent["id"], nextStart: Date, nextEnd: Date) => void
}) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const slotCount = useMemo(() => visibleDates.length * 2, [visibleDates.length])
  const rangeStart = useMemo(
    () => new Date(visibleDates[0].getFullYear(), visibleDates[0].getMonth(), visibleDates[0].getDate()),
    [visibleDates]
  )
  const placements = useMemo(() => {
    return events
      .map((event) => {
        const placement = getEventGridPlacement(event, visibleDates)
        return placement ? { event, placement } : null
      })
      .filter((item): item is { event: CalendarEvent; placement: EventPlacement } => Boolean(item))
  }, [events, visibleDates])

  const conflictEventIds = useMemo(() => findConflictingEventIds(events), [events])
  const todayStartColumn = todayColumnIndex === -1 ? null : todayColumnIndex * 2 + 1

  const commitSlots = useCallback(
    (eventId: CalendarEvent["id"], startSlot: number, spanSlots: number) => {
      if (!onEventUpdate) return
      const clampedStart = Math.max(0, Math.min(slotCount - 1, startSlot))
      const clampedSpan = Math.max(1, Math.min(slotCount - clampedStart, spanSlots))
      const nextStart = new Date(rangeStart.getTime() + clampedStart * HALF_DAY_IN_MS)
      const nextEnd = new Date(rangeStart.getTime() + (clampedStart + clampedSpan) * HALF_DAY_IN_MS)
      onEventUpdate(eventId, nextStart, nextEnd)
    },
    [onEventUpdate, rangeStart, slotCount]
  )

  const getSlotWidth = useCallback(() => {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return null
    return rect.width / slotCount
  }, [slotCount])
  const isDraggable = Boolean(onEventUpdate)

  const startDrag = useCallback(
    (
      mouseEvent: React.MouseEvent,
      payload: { event: CalendarEvent; placement: EventPlacement; mode: "move" | "resize-start" | "resize-end" }
    ) => {
      if (!onEventUpdate) return
      mouseEvent.preventDefault()
      mouseEvent.stopPropagation()
      const slotWidth = getSlotWidth()
      if (!slotWidth) return
      const startX = mouseEvent.clientX
      const { placement, event, mode } = payload
      const handleMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault()
        const deltaSlots = Math.round((moveEvent.clientX - startX) / slotWidth)
        if (mode === "move") {
          const nextStart = Math.max(0, Math.min(slotCount - placement.spanSlots, placement.startSlot + deltaSlots))
          commitSlots(event.id, nextStart, placement.spanSlots)
        } else if (mode === "resize-start") {
          const nextStart = Math.max(0, Math.min(placement.startSlot + deltaSlots, placement.startSlot + placement.spanSlots - 1))
          const nextSpan = placement.spanSlots + (placement.startSlot - nextStart)
          commitSlots(event.id, nextStart, nextSpan)
        } else if (mode === "resize-end") {
          const nextSpan = Math.max(1, Math.min(slotCount - placement.startSlot, placement.spanSlots + deltaSlots))
          commitSlots(event.id, placement.startSlot, nextSpan)
        }
      }
      const handleUp = () => {
        window.removeEventListener("mousemove", handleMove)
        window.removeEventListener("mouseup", handleUp)
      }
      window.addEventListener("mousemove", handleMove)
      window.addEventListener("mouseup", handleUp)
    },
    [commitSlots, getSlotWidth, onEventUpdate, slotCount]
  )

  return (
    <div ref={gridRef} className="calendar-grid fleet-calendar-grid-body" style={{ gridTemplateColumns }}>
      {visibleDates.map((date) => (
        <div
          key={`${rowKey}-${date.toISOString()}`}
          className={cn("calendar-day-cell", {
            "calendar-day-cell--weekend": isWeekend(date),
            "calendar-day-cell--today": todayStartColumn !== null && visibleDates[todayColumnIndex]?.toDateString() === date.toDateString(),
          })}
          style={{ gridColumn: "span 2", gridRow: "1 / 2" }}
        />
      ))}
      {todayStartColumn !== null ? (
        <div
          className="calendar-today-marker"
          style={{
            gridColumnStart: todayStartColumn,
            gridColumnEnd: todayStartColumn + 2,
            gridRow: "1 / 2",
          }}
          aria-hidden="true"
        />
      ) : null}
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
          {isDraggable ? (
            <>
              <div
                className="calendar-event-handle calendar-event-handle--move"
                onMouseDown={(mouseEvent) => startDrag(mouseEvent, { event, placement, mode: "move" })}
                title="Drag to move"
              />
              <div
                className="calendar-event-handle calendar-event-handle--resize-start"
                onMouseDown={(mouseEvent) => startDrag(mouseEvent, { event, placement, mode: "resize-start" })}
                title="Resize start"
              />
              <div
                className="calendar-event-handle calendar-event-handle--resize-end"
                onMouseDown={(mouseEvent) => startDrag(mouseEvent, { event, placement, mode: "resize-end" })}
                title="Resize end"
              />
            </>
          ) : null}
          <CalendarEventPill event={event} onClick={onEventClick} hasConflict={conflictEventIds.has(String(event.id))} />
        </div>
      ))}
    </div>
  )
}

function CalendarEventPill({
  event,
  onClick,
  hasConflict,
}: {
  event: CalendarEvent
  onClick?: (event: CalendarEvent) => void
  hasConflict?: boolean
}) {
  const meta = calendarEventTypes[event.type]
  const statusTone = getCalendarBookingStatusTone(event.bookingStatus)
  const isCarWithCustomerStage = event.stageLabel?.toLowerCase().includes("car with customer")
  const effectiveStatusTone = isCarWithCustomerStage ? { tone: "closing", label: "Closing" } : statusTone
  const start = new Date(event.start)
  const end = new Date(event.end)

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className="calendar-event-button"
      aria-label={`Open event ${event.title}`}
    >
      <div
        className={cn("calendar-event", meta.surface, meta.border, effectiveStatusTone ? `calendar-event-status-${effectiveStatusTone.tone}` : null, {
          "calendar-event--conflict": hasConflict,
        })}
      >
        <div className="calendar-event-title-row">
          <div className="calendar-event-title">{event.title}</div>
          {hasConflict ? <span className="calendar-event-conflict-dot" aria-hidden="true">!</span> : null}
        </div>
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

function findConflictingEventIds(events: CalendarEvent[]) {
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  const conflicts = new Set<string>()
  for (let i = 0; i < sorted.length; i++) {
    const currentStart = new Date(sorted[i].start).getTime()
    const currentEnd = new Date(sorted[i].end).getTime()
    for (let j = i + 1; j < sorted.length; j++) {
      const compareStart = new Date(sorted[j].start).getTime()
      if (compareStart >= currentEnd) break
      const compareEnd = new Date(sorted[j].end).getTime()
      if (compareEnd > currentStart) {
        conflicts.add(String(sorted[i].id))
        conflicts.add(String(sorted[j].id))
      }
    }
  }
  return conflicts
}
