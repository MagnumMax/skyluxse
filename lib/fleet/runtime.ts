import type { Booking } from "@/lib/domain/entities"

const DEFAULT_WINDOW_DAYS = 30

export function calculateVehicleRuntimeMetrics(bookings: Booking[], referenceDate = new Date()) {
  const nowMs = referenceDate.getTime()
  const windowStartMs = nowMs - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const windowDuration = Math.max(nowMs - windowStartMs, 1)
  const currentYear = referenceDate.getFullYear()

  const windowBookedMs = bookings.reduce((total, booking) => total + computeWindowOverlapMs(booking, windowStartMs, nowMs), 0)
  const utilization = Math.min(1, windowBookedMs / windowDuration)

  const revenueYTD = bookings.reduce((sum, booking) => {
    const startYear = getYearSafe(booking.startDate)
    if (startYear === currentYear) {
      return sum + Math.max(0, booking.totalAmount ?? 0)
    }
    return sum
  }, 0)

  return { utilization, revenueYTD }
}

function computeWindowOverlapMs(booking: Booking, windowStartMs: number, windowEndMs: number) {
  const start = Date.parse(booking.startDate)
  const end = Date.parse(booking.endDate)
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0
  }
  const overlapStart = Math.max(start, windowStartMs)
  const overlapEnd = Math.min(end, windowEndMs)
  return Math.max(0, overlapEnd - overlapStart)
}

function getYearSafe(value: string) {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return null
  }
  return new Date(timestamp).getFullYear()
}
