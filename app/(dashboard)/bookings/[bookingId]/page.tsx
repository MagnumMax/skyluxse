import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { OperationsBookingDetail } from "@/components/operations-booking-detail"
import { loadBookingDetail } from "@/lib/data/load-booking-detail"
import { getLiveBookingById } from "@/lib/data/live-data"
import { resolveBookingViewVariant } from "@/lib/utils"

type PageProps = {
  params: Promise<{ bookingId: string }>
  searchParams?: Promise<{ view?: string | string[] }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { bookingId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const booking = await getLiveBookingById(bookingId)
  const variant = resolveBookingViewVariant(resolvedSearchParams?.view)
  const prefix = variant === "exec" ? "Executive booking" : variant === "operations" ? "Booking detail" : "Sales booking"
  return {
    title: booking ? `${booking.code} · ${prefix}` : `${prefix} ${bookingId}`,
  }
}

export default async function BookingDetailPage({ params, searchParams }: PageProps) {
  const { bookingId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const detail = await loadBookingDetail({ bookingId, view: resolvedSearchParams?.view })
  if (!detail) {
    notFound()
  }
  const { booking, client, driver, variant } = detail
  return <OperationsBookingDetail booking={booking} client={client} driver={driver} variant={variant} />
}
