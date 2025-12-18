import test from "node:test"
import assert from "node:assert/strict"

import { buildVisibleDates, getEventGridPlacement } from "../../lib/fleet/calendar-grid"
import type { CalendarEvent } from "../../lib/domain/entities"

function utcDayStamp(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

test("buildVisibleDates normalizes baseDate and increments by calendar days", () => {
  const baseDate = new Date(2025, 2, 8, 15, 30, 45) // non-midnight on purpose
  const dates = buildVisibleDates(baseDate, 0, 3)

  assert.equal(dates.length, 3)
  assert.equal(dates[0].getHours(), 0)
  assert.equal(dates[0].getMinutes(), 0)

  assert.equal((utcDayStamp(dates[1]) - utcDayStamp(dates[0])) / 86_400_000, 1)
  assert.equal((utcDayStamp(dates[2]) - utcDayStamp(dates[1])) / 86_400_000, 1)
})

test("getEventGridPlacement uses half-day slots without drifting", () => {
  const baseDate = new Date(2025, 2, 8, 15, 30, 0)
  const visibleDates = buildVisibleDates(baseDate, 0, 2)

  const event: CalendarEvent = {
    id: "evt-1",
    carId: "car-1",
    type: "rental",
    title: "Test",
    start: `${visibleDates[0].getFullYear()}-${String(visibleDates[0].getMonth() + 1).padStart(2, "0")}-${String(visibleDates[0].getDate()).padStart(2, "0")}T09:00:00+04:00`,
    end: `${visibleDates[0].getFullYear()}-${String(visibleDates[0].getMonth() + 1).padStart(2, "0")}-${String(visibleDates[0].getDate()).padStart(2, "0")}T13:00:00+04:00`,
    priority: "medium",
  }

  const placement = getEventGridPlacement(event, visibleDates)
  assert.ok(placement)
  assert.equal(placement.startSlot, 0)
  assert.equal(placement.spanSlots, 2)
})

