import { notFound } from "next/navigation"

import { getFleetVehicleProfile } from "@/lib/data/fleet-data"
import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { VehicleForm } from "@/components/fleet/vehicle-form"
import { VehicleDocumentsManager } from "@/components/fleet/vehicle-documents-manager"
import { VehicleGalleryManager } from "@/components/fleet/vehicle-gallery-manager"
import { VehicleStatsGrid } from "@/components/fleet/vehicle-stats-grid"
import { getVehicleOptions } from "@/lib/data/vehicle-options"

type PageProps = { params: Promise<{ carId: string }> }

export default async function VehicleEditPage({ params }: PageProps) {
  const { carId } = await params
  const profile = await getFleetVehicleProfile(carId)
  if (!profile) {
    notFound()
  }

  const { vehicle } = profile
  const options = await getVehicleOptions()

  return (
    <DashboardPageShell>
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Fleet</p>
        <h1 className="text-3xl font-semibold tracking-tight">Редактирование авто</h1>
      </div>

      <div className="space-y-6">
        <VehicleForm mode="edit" vehicle={vehicle} formId="vehicle-edit-form" renderActions={false} options={options} />
        <VehicleStatsGrid vehicle={vehicle} />
        <VehicleGalleryManager
          vehicleId={String(vehicle.id)}
          documents={(vehicle.documents ?? []).filter((doc) => doc.type === "gallery" || doc.type === "photo")}
        />
        <VehicleDocumentsManager vehicleId={String(vehicle.id)} documents={vehicle.documents ?? []} />
        <div className="flex justify-end">
          <button
            type="submit"
            form="vehicle-edit-form"
            className="inline-flex h-10 items-center justify-center rounded-md border border-transparent bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          >
            Сохранить изменения
          </button>
        </div>
      </div>
    </DashboardPageShell>
  )
}
