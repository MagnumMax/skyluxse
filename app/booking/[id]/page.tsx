import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { OperationsBookingDetail } from "@/components/operations-booking-detail"
import { loadBookingDetail } from "@/lib/data/load-booking-detail"
import { getLiveBookingById } from "@/lib/data/live-data"
import { resolveBookingViewVariant } from "@/lib/utils"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ view?: string | string[] }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const booking = await getLiveBookingById(id)
  const variant = resolveBookingViewVariant(resolvedSearchParams?.view)
  const prefix = variant === "exec" ? "Executive booking" : variant === "operations" ? "Booking detail" : "Sales booking"
  return {
    title: booking ? `${booking.code} · ${prefix}` : `${prefix} ${id}`,
  }
}

export default async function BookingPublicPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const detail = await loadBookingDetail({ bookingId: id, view: resolvedSearchParams?.view })
  if (!detail) {
    notFound()
  }
  const { booking, client, driver, services, variant } = detail

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="rounded-[32px] border border-border/60 bg-background/95 p-6 shadow-lg shadow-black/5">
          <OperationsBookingDetail booking={booking} client={client} driver={driver} services={services} variant={variant} />
        </div>
      </div>
    </div>
  )
}
