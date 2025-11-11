export const dynamic = "force-dynamic" // Kanban board relies on live drag/drop updates, so skip caching.

import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { SalesBookingsBoard } from "@/components/sales-bookings-board"
import { getLiveBookings, getLiveDrivers } from "@/lib/data/live-data"

export default async function SalesBookingsPage() {
  const [bookings, drivers] = await Promise.all([getLiveBookings(), getLiveDrivers()])
  return (
    <DashboardPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Booking lifecycle board</h1>
        </div>
      </header>

      <SalesBookingsBoard bookings={bookings} drivers={drivers} />
    </DashboardPageShell>
  )
}
