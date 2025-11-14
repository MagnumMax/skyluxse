import type { CalendarEvent } from "@/lib/domain/entities"

export const DAY_IN_MS = 86_400_000
export const HALF_DAY_IN_MS = DAY_IN_MS / 2

export function getStartOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function buildVisibleDates(baseDate: Date, offset: number, days: number) {
  const rangeStart = new Date(baseDate.getTime() + offset * DAY_IN_MS)
  return Array.from({ length: days }, (_, index) => new Date(rangeStart.getTime() + index * DAY_IN_MS))
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
