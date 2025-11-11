import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { MaintenanceAutomationForm } from "@/components/maintenance-automation-form"
import { getLiveFleetVehicles } from "@/lib/data/live-data"

export default async function MaintenanceCreatePage() {
  const vehicles = await getLiveFleetVehicles()
  const vehicleOptions = vehicles.map((vehicle) => ({ id: String(vehicle.id), label: `${vehicle.name} (${vehicle.plate})` }))
  return (
    <DashboardPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Schedule automation</h1>
        </div>
      </header>
      <MaintenanceAutomationForm vehicles={vehicleOptions} />
    </DashboardPageShell>
  )
}
