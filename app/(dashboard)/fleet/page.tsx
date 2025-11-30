import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { OperationsFleetClient } from "@/components/operations-fleet-client"
import { getFleetDirectoryData } from "@/lib/data/live-data"

export default async function OperationsFleetPage() {
  const { vehicles, bookings } = await getFleetDirectoryData()
  return (
    <DashboardPageShell>
      <OperationsFleetClient vehicles={vehicles} bookings={bookings} />
    </DashboardPageShell>
  )
}
