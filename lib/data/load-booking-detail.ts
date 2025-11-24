import type { Booking, Client, Driver, VehicleMaintenanceEntry } from "@/lib/domain/entities"
import { resolveBookingViewVariant, type BookingViewVariant } from "@/lib/utils"
import { getLiveBookingById, getLiveClientById, getLiveDrivers } from "./live-data"
import { getVehicleServices } from "./fleet-data"

export type LoadedBookingDetail = {
  booking: Booking
  client?: Client
  driver?: Driver
  services?: VehicleMaintenanceEntry[]
  variant: BookingViewVariant
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
  const [client, drivers, services] = await Promise.all([
    booking.clientId ? getLiveClientById(String(booking.clientId)) : Promise.resolve(null),
    getLiveDrivers(),
    booking.carId ? getVehicleServices(String(booking.carId)) : Promise.resolve([]),
  ])
  const driver = booking.driverId ? drivers.find((entry) => String(entry.id) === String(booking.driverId)) : null
  return {
    booking,
    client: client ?? undefined,
    driver: driver ?? undefined,
    services,
    variant,
  }
}
