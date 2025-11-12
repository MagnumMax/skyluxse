import "@/app/(dashboard)/fleet-calendar/fleet-calendar.css"

import { OperationsFleetCalendarClient } from "@/app/(dashboard)/fleet-calendar/fleet-calendar-client"
import { getFleetCalendarData } from "@/lib/data/live-data"

export async function renderFleetCalendar() {
  const { vehicles, bookings, events } = await getFleetCalendarData()

  return <OperationsFleetCalendarClient vehicles={vehicles} bookings={bookings} events={events} />
}
