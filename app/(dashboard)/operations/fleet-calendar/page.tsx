export const dynamic = "force-dynamic" // Calendar needs near-real-time bookings and conflict data.

import { OperationsFleetCalendarClient } from "./fleet-calendar-client"
import { getFleetCalendarData } from "@/lib/data/live-data"

export default async function OperationsFleetCalendarPage() {
  const { vehicles, events } = await getFleetCalendarData()
  return <OperationsFleetCalendarClient vehicles={vehicles} events={events} />
}
