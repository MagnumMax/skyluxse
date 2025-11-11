import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { VehicleIntakeForm } from "@/components/vehicle-intake-form"

export default function VehicleCreatePage() {
  return (
    <DashboardPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Onboard a vehicle</h1>
        </div>
      </header>
      <VehicleIntakeForm />
    </DashboardPageShell>
  )
}
