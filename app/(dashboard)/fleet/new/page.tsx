import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { VehicleForm } from "@/components/fleet/vehicle-form"
import { getVehicleOptions } from "@/lib/data/vehicle-options"

export default async function VehicleCreatePage() {
  const options = await getVehicleOptions()
  return (
    <DashboardPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Onboard a vehicle</h1>
        </div>
      </header>
      <VehicleForm mode="create" options={options} />
    </DashboardPageShell>
  )
}
