import type { Booking, Client, Driver, VehicleMaintenanceEntry } from "@/lib/domain/entities"
import { resolveBookingViewVariant, type BookingViewVariant } from "@/lib/utils"
import { getLiveBookingById, getLiveClientById, getLiveDrivers } from "./live-data"
import { getVehicleServices } from "./fleet-data"
import { getTasksByBookingId } from "./tasks"

export type LoadedBookingDetail = {
  booking: Booking
  client?: Client
  driver?: Driver
  services?: VehicleMaintenanceEntry[]
  variant: BookingViewVariant
  pickupMiles: number
  pickupFuel: string
  returnMiles: number
  returnFuel: string
}

export async function loadBookingDetail({
  bookingId,
  view,
}: {
  bookingId: string
  view?: string | string[]
}): Promise<LoadedBookingDetail | null> {
  const booking = await getLiveBookingById(bookingId)
  if (!booking) {
    return null
  }
  const variant = resolveBookingViewVariant(view)
  const [client, drivers, services, taskMetrics] = await Promise.all([
    booking.clientId ? getLiveClientById(String(booking.clientId)) : Promise.resolve(null),
    getLiveDrivers(),
    booking.carId ? getVehicleServices(String(booking.carId)) : Promise.resolve([]),
    getTasksByBookingId(bookingId),
  ])
  const driver = booking.driverId ? drivers.find((entry) => String(entry.id) === String(booking.driverId)) : null
  return {
    booking,
    client: client ?? undefined,
    driver: driver ?? undefined,
    services,
    variant,
    pickupMiles: taskMetrics.pickupMiles,
    pickupFuel: String(taskMetrics.pickupFuel),
    returnMiles: taskMetrics.returnMiles,
    returnFuel: String(taskMetrics.returnFuel),
  }
}
