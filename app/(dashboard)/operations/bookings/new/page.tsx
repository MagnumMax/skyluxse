import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { BookingCreateForm } from "@/components/booking-create-form"
import { getLiveClients, getLiveFleetVehicles } from "@/lib/data/live-data"

export default async function BookingCreatePage() {
  const [clients, vehicles] = await Promise.all([getLiveClients(), getLiveFleetVehicles()])
  const clientOptions = clients.map((client) => ({ id: String(client.id), label: client.name }))
  const vehicleOptions = vehicles.map((vehicle) => ({ id: String(vehicle.id), label: `${vehicle.name} (${vehicle.plate})` }))
  return (
    <DashboardPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Fallback creation flow</h1>
        </div>
      </header>
      <BookingCreateForm clients={clientOptions} vehicles={vehicleOptions} />
    </DashboardPageShell>
  )
}
