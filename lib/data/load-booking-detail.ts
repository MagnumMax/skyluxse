import type { Booking, Client, Driver } from "@/lib/domain/entities"
import { resolveBookingViewVariant, type BookingViewVariant } from "@/lib/utils"
import { getLiveBookingById, getLiveClientById, getLiveDrivers } from "./live-data"

export type LoadedBookingDetail = {
  booking: Booking
  client?: Client
  driver?: Driver
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
  const [client, drivers] = await Promise.all([
    booking.clientId ? getLiveClientById(String(booking.clientId)) : Promise.resolve(null),
    getLiveDrivers(),
  ])
  const driver = booking.driverId ? drivers.find((entry) => String(entry.id) === String(booking.driverId)) : null
  return {
    booking,
    client: client ?? undefined,
    driver: driver ?? undefined,
    variant,
  }
}
