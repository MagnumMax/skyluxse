export const dynamic = "force-dynamic" // Kanban board relies on live drag/drop updates, so skip caching.

import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { BookingsClient } from "@/app/(dashboard)/bookings/bookings-client"
import { getLiveBookings, getLiveDrivers } from "@/lib/data/live-data"
import { getKommoStages } from "@/app/actions/kommo-stages"
import { getBookingBoardHeading, resolveBookingBoardVariant } from "@/lib/utils"

type PageProps = { searchParams?: Promise<{ view?: string | string[] }> }

export default async function BookingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const variant = resolveBookingBoardVariant(resolvedSearchParams?.view)
  const [bookings, drivers, stages] = await Promise.all([
    getLiveBookings(),
    getLiveDrivers(),
    getKommoStages(),
  ])
  const heading = getBookingBoardHeading(variant)
  return (
    <DashboardPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        </div>
      </header>

      <BookingsClient bookings={bookings} drivers={drivers} stages={stages} readOnly={variant === "exec"} />
    </DashboardPageShell>
  )
}
