import type { CalendarEvent } from "@/lib/domain/entities"
import { toDubaiDate } from "@/lib/formatters"

export const DAY_IN_MS = 86_400_000
export const HALF_DAY_IN_MS = DAY_IN_MS / 2

function addDaysLocal(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function utcDayStamp(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function getStartOfToday() {
  const now = toDubaiDate(new Date())
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function buildVisibleDates(baseDate: Date, offset: number, days: number) {
  const normalizedBase = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
  const rangeStart = addDaysLocal(normalizedBase, offset)
  return Array.from({ length: days }, (_, index) => addDaysLocal(rangeStart, index))
}

export type EventPlacement = { startSlot: number; spanSlots: number }

export function getEventGridPlacement(event: CalendarEvent, visibleDates: Date[]): EventPlacement | null {
  if (visibleDates.length === 0) {
    return null
  }

  const rangeStart = new Date(
    visibleDates[0].getFullYear(),
    visibleDates[0].getMonth(),
    visibleDates[0].getDate()
  )
  const rangeEnd = addDaysLocal(rangeStart, visibleDates.length)
  
  // Convert event dates to Dubai time for placement calculation
  const eventStart = toDubaiDate(event.start)
  const eventEnd = toDubaiDate(event.end)
  
  const clampedStart = eventStart < rangeStart ? rangeStart : eventStart
  const clampedEnd = eventEnd > rangeEnd ? rangeEnd : eventEnd

  if (clampedEnd <= rangeStart || clampedStart >= rangeEnd) {
    return null
  }

  const slotCount = visibleDates.length * 2
  const rangeStartDay = utcDayStamp(rangeStart)

  const startDay = utcDayStamp(clampedStart)
  const startDayDiff = Math.floor((startDay - rangeStartDay) / DAY_IN_MS)
  const startHalf = clampedStart.getHours() >= 12 ? 1 : 0
  const rawStartSlot = startDayDiff * 2 + startHalf
  const startSlot = clamp(rawStartSlot, 0, slotCount - 1)

  const endDay = utcDayStamp(clampedEnd)
  const endDayDiff = Math.floor((endDay - rangeStartDay) / DAY_IN_MS)
  const endHourFraction =
    clampedEnd.getHours() +
    clampedEnd.getMinutes() / 60 +
    clampedEnd.getSeconds() / 3600 +
    clampedEnd.getMilliseconds() / 3_600_000
  const endHalf = endHourFraction === 0 ? 0 : endHourFraction <= 12 ? 1 : 2
  const rawEndSlot = endDayDiff * 2 + endHalf
  const endSlot = clamp(Math.max(startSlot + 1, rawEndSlot), startSlot + 1, slotCount)
  const spanSlots = Math.max(1, endSlot - startSlot)

  return { startSlot, spanSlots }
}
