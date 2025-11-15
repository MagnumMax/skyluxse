import test from "node:test"
import assert from "node:assert/strict"

import { deriveBookingHighlights } from "../../lib/fleet/booking-utils"
import type { Booking } from "../../lib/domain/entities"

const baseBooking: Booking = {
  id: "bk-base",
  code: "BK-BASE",
  clientId: "client",
  clientName: "Base Client",
  carId: "car",
  carName: "Base Car",
  startDate: "2025-11-10",
  endDate: "2025-11-11",
  startTime: "08:00",
  endTime: "10:00",
  driverId: null,
  status: "preparation",
  totalAmount: 0,
  paidAmount: 0,
  deposit: 0,
  priority: "medium",
  type: "rental",
  channel: "manual",
  ownerId: "owner",
  segment: "resident",
}

const makeBooking = (overrides: Partial<Booking>): Booking => ({
  ...baseBooking,
  ...overrides,
})

test("deriveBookingHighlights returns correct active/next/last bookings", () => {
  const bookings: Booking[] = [
    makeBooking({
      id: "past",
      code: "BK-PAST",
      startDate: "2025-11-05",
      endDate: "2025-11-06",
      status: "settlement",
    }),
    makeBooking({
      id: "active",
      code: "BK-ACTIVE",
      startDate: "2025-11-10",
      endDate: "2025-11-12",
      status: "in-rent",
    }),
    makeBooking({
      id: "upcoming",
      code: "BK-NEXT",
      startDate: "2025-11-15",
      endDate: "2025-11-16",
      status: "delivery",
    }),
  ]

  const referenceDate = new Date("2025-11-11T10:00:00Z")
  const { activeBooking, nextBooking, lastBooking } = deriveBookingHighlights(bookings, referenceDate)

  assert.equal(activeBooking?.id, "active")
  assert.equal(nextBooking?.id, "upcoming")
  assert.equal(lastBooking?.id, "past")
})
