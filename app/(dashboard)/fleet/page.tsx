import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { OperationsFleetClient } from "@/components/operations-fleet-client"
import { getFleetCalendarData } from "@/lib/data/live-data"

export default async function OperationsFleetPage() {
  const { vehicles, bookings, events } = await getFleetCalendarData()
  return (
    <DashboardPageShell>
      <OperationsFleetClient vehicles={vehicles} bookings={bookings} events={events} />
    </DashboardPageShell>
  )
}
