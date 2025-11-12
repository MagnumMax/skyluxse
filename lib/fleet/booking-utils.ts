import type { Booking } from "@/lib/domain/entities"

export type BookingHighlights = {
  activeBooking?: Booking
  nextBooking?: Booking
  lastBooking?: Booking
}

export function deriveBookingHighlights(bookings: Booking[], referenceDate = new Date()): BookingHighlights {
  const sorted = [...bookings].sort((a, b) => getStart(a).getTime() - getStart(b).getTime())
  const activeBooking = sorted.find((booking) => {
    const start = getStart(booking)
    const end = getEnd(booking)
    return booking.status === "in-rent" || (referenceDate >= start && referenceDate <= end)
  })
  const upcoming = sorted.filter((booking) => getStart(booking) > referenceDate)
  const past = [...bookings]
    .filter((booking) => getEnd(booking) < referenceDate)
    .sort((a, b) => getEnd(b).getTime() - getEnd(a).getTime())

  const nextBooking = activeBooking ? upcoming.find((booking) => booking.id !== activeBooking.id) : upcoming[0]
  const lastBooking = activeBooking ? past.find((booking) => booking.id !== activeBooking.id) : past[0]

  return { activeBooking, nextBooking, lastBooking }
}

function getStart(booking: Booking) {
  return coerceDate(booking.startDate) ?? coerceDate(booking.startTime) ?? new Date(0)
}

function getEnd(booking: Booking) {
  return coerceDate(booking.endDate) ?? coerceDate(booking.endTime) ?? new Date(0)
}

function coerceDate(value?: string) {
  if (!value) return null
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return null
  return new Date(timestamp)
}
