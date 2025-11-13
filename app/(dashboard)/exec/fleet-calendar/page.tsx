export const dynamic = "force-dynamic" // Executive snapshot should stay in sync with live fleet collisions.

import "@/app/(dashboard)/fleet-calendar/fleet-calendar.css"

import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { FleetCalendarBoard } from "@/components/fleet-calendar"
import { getFleetCalendarData } from "@/lib/data/live-data"
import { normalizePeriodRange } from "@/lib/constants/calendar"

interface ExecFleetCalendarPageProps {
  searchParams?: {
    from?: string
    to?: string
  }
}

export default async function ExecFleetCalendarPage({ searchParams }: ExecFleetCalendarPageProps) {
  const { vehicles, events } = await getFleetCalendarData()
  const periodRange = normalizePeriodRange(searchParams?.from, searchParams?.to)
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Utilisation snapshot"
        description="Read-only snapshot that mirrors operations data but highlights load for KPI reviews."
        meta={
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Force refresh
          </span>
        }
      />
      <FleetCalendarBoard vehicles={vehicles} events={events} periodRange={periodRange} />
    </DashboardPageShell>
  )
}
