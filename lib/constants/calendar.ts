import type { BookingStatus, CalendarEventType } from "@/lib/domain/entities"
import { toDubaiDate } from "@/lib/formatters"

export type PeriodRange = {
  from: string
  to: string
}

export const DEFAULT_PERIOD_DAYS = 7
export const MAX_PERIOD_DAYS = 31

function formatDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0")
  const day = `${date.getUTCDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDate(value?: string): Date | null {
  if (!value) return null
  // Ожидаем формат YYYY-MM-DD, без использования внешних библиотек.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])

  const date = new Date(Date.UTC(year, monthIndex, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date.getTime())
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

const todayUTC = (() => {
  const now = new Date()
  const dubai = toDubaiDate(now)
  return new Date(Date.UTC(dubai.getFullYear(), dubai.getMonth(), dubai.getDate()))
})()

export const DEFAULT_PERIOD_RANGE: PeriodRange = {
  from: formatDate(todayUTC),
  to: formatDate(addDaysUTC(todayUTC, DEFAULT_PERIOD_DAYS - 1)),
}

/**
 * Нормализует диапазон дат в формате YYYY-MM-DD.
 * Используется UTC-основанная логика, чтобы избежать проблем с часовыми поясами.
 */
export function normalizePeriodRange(fromParam?: string, toParam?: string): PeriodRange {
  let fromDate = parseDate(fromParam) ?? parseDate(DEFAULT_PERIOD_RANGE.from)!
  let toDate = parseDate(toParam)

  if (!toDate) {
    toDate = addDaysUTC(fromDate, DEFAULT_PERIOD_DAYS - 1)
  }

  // Если to < from → to = from
  if (toDate.getTime() < fromDate.getTime()) {
    toDate = new Date(fromDate.getTime())
  }

  // Ограничиваем максимальную длину диапазона MAX_PERIOD_DAYS
  const maxEndDate = addDaysUTC(fromDate, MAX_PERIOD_DAYS - 1)
  if (toDate.getTime() > maxEndDate.getTime()) {
    toDate = maxEndDate
  }

  return {
    from: formatDate(fromDate),
    to: formatDate(toDate),
  }
}

export const calendarEventTypes: Record<CalendarEventType, { label: string; surface: string; border: string }> = {
  reservation: {
    label: "Reservation",
    surface: "calendar-event-surface-reservation",
    border: "calendar-event-border-reservation",
  },
  rental: {
    label: "Rental",
    surface: "calendar-event-surface-rental",
    border: "calendar-event-border-rental",
  },
  maintenance: {
    label: "Maintenance",
    surface: "calendar-event-surface-maintenance",
    border: "calendar-event-border-maintenance",
  },
  repair: {
    label: "Repair",
    surface: "calendar-event-surface-repair",
    border: "calendar-event-border-repair",
  },
}

export type CalendarBookingStatusGroup = "pre-issue" | "active" | "closing"

const calendarBookingStatusGroups: Record<CalendarBookingStatusGroup, { label: string }> = {
  "pre-issue": { label: "Pre-issue" },
  active: { label: "Active" },
  closing: { label: "Closing" },
}

const calendarBookingStatusGroupByStatus: Record<BookingStatus, CalendarBookingStatusGroup> = {
  new: "pre-issue",
  preparation: "pre-issue",
  delivery: "pre-issue",
  "in-rent": "active",
  settlement: "closing",
}

export function getCalendarBookingStatusTone(status?: BookingStatus | null) {
  if (!status) return null
  const tone = calendarBookingStatusGroupByStatus[status]
  if (!tone) return null
  const meta = calendarBookingStatusGroups[tone]
  return { tone, label: meta.label }
}
