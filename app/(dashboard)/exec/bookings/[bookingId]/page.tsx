import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { OperationsBookingDetail } from "@/components/operations-booking-detail"
import { getLiveBookingById, getLiveClientById, getLiveDrivers } from "@/lib/data/live-data"

type PageProps = { params: { bookingId: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const booking = await getLiveBookingById(params.bookingId)
  return {
    title: booking ? `${booking.code} · Executive booking` : `Executive booking ${params.bookingId}`,
  }
}

export default async function ExecBookingDetailPage({ params }: PageProps) {
  const booking = await getLiveBookingById(params.bookingId)
  if (!booking) {
    notFound()
  }
  const [client, drivers] = await Promise.all([
    booking.clientId ? getLiveClientById(String(booking.clientId)) : Promise.resolve(null),
    getLiveDrivers(),
  ])
  const driver = booking.driverId ? drivers.find((entry) => String(entry.id) === String(booking.driverId)) : null
  return <OperationsBookingDetail booking={booking} client={client ?? undefined} driver={driver ?? undefined} variant="exec" />
}
