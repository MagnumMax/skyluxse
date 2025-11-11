import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { OperationsFleetTable } from "@/components/operations-fleet-table"
import { getLiveFleetVehicles } from "@/lib/data/live-data"

export default async function OperationsFleetPage() {
  const fleetCars = await getLiveFleetVehicles()
  return (
    <DashboardPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Fleet directory</h1>
        </div>
      </header>

      <OperationsFleetTable cars={fleetCars} />
    </DashboardPageShell>
  )
}
