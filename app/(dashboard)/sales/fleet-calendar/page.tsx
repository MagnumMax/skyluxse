export const dynamic = "force-dynamic" // Sales calendar reflects Ops feed, so caching would desync conflicts.

import "@/app/(dashboard)/operations/fleet-calendar/fleet-calendar.css"

import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { FleetCalendarBoard } from "@/components/fleet-calendar"
import { getFleetCalendarData } from "@/lib/data/live-data"

export default async function SalesFleetCalendarPage() {
  const { vehicles, events } = await getFleetCalendarData()
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Conflict calendar"
        description="Shared view with operations, filtered for booking conflicts and delivery slots relevant to sales owners."
        meta={
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Live feed
          </span>
        }
      />
      <FleetCalendarBoard vehicles={vehicles} events={events} bookingRouteBase="/sales" />
    </DashboardPageShell>
  )
}
