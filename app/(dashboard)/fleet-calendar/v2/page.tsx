export const dynamic = "force-dynamic"

import { FleetCalendarV2Client } from "@/app/(dashboard)/fleet-calendar/fleet-calendar-v2-client"
import { getFleetCalendarData } from "@/lib/data/live-data"

type FleetCalendarSearchParams = Promise<{
  vehicleId?: string | string[]
}>

export default async function FleetCalendarV2Page({
  searchParams,
}: {
  searchParams?: FleetCalendarSearchParams
}) {
  const { vehicles, bookings, events } = await getFleetCalendarData()
  const params = (await searchParams) ?? {}
  const rawVehicleId = params.vehicleId
  const initialVehicleId = Array.isArray(rawVehicleId) ? rawVehicleId[0] : rawVehicleId

  return (
    <FleetCalendarV2Client
      vehicles={vehicles}
      bookings={bookings}
      events={events}
      initialVehicleId={initialVehicleId}
    />
  )
}
