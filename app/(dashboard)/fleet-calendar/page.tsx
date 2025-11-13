export const dynamic = "force-dynamic" // Fleet calendar must stay in sync for every role.

import "@/app/(dashboard)/fleet-calendar/fleet-calendar.css"

import { OperationsFleetCalendarClient } from "@/app/(dashboard)/fleet-calendar/fleet-calendar-client"
import { getFleetCalendarData } from "@/lib/data/live-data"

export default async function FleetCalendarSharedPage() {
  const { vehicles, bookings, events } = await getFleetCalendarData()

  return (
    <OperationsFleetCalendarClient
      vehicles={vehicles}
      bookings={bookings}
      events={events}
    />
  )
}
