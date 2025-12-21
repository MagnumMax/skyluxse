export const dynamic = "force-dynamic" // Fleet calendar must stay in sync for every role.

import "@/app/(dashboard)/fleet-calendar/fleet-calendar.css"

import { OperationsFleetCalendarClient } from "@/app/(dashboard)/fleet-calendar/fleet-calendar-client"
import { getFleetCalendarData } from "@/lib/data/live-data"
import { getStartOfToday } from "@/lib/fleet/calendar-grid"

type FleetCalendarSearchParams = Promise<{
  vehicleId?: string | string[]
}>

export default async function FleetCalendarSharedPage({
  searchParams,
}: {
  searchParams?: FleetCalendarSearchParams
}) {
  const { vehicles, bookings, events } = await getFleetCalendarData()
  const params = (await searchParams) ?? {}
  const rawVehicleId = params.vehicleId
  const initialVehicleId = Array.isArray(rawVehicleId) ? rawVehicleId[0] : rawVehicleId

  const today = getStartOfToday()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  return (
    <OperationsFleetCalendarClient
      vehicles={vehicles}
      bookings={bookings}
      events={events}
      initialVehicleId={initialVehicleId}
      initialDateStr={todayString}
    />
  )
}
