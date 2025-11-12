import Link from "next/link"
import { notFound } from "next/navigation"

import { getFleetVehicleProfile } from "@/lib/data/fleet-data"
import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { VehicleProfileHero } from "@/components/fleet/vehicle-profile-hero"
import { VehicleStatsGrid } from "@/components/fleet/vehicle-stats-grid"
import { VehicleRemindersCard } from "@/components/fleet/vehicle-reminders-card"
import { VehicleBookingsCard } from "@/components/fleet/vehicle-bookings-card"
import { VehicleMaintenanceCard } from "@/components/fleet/vehicle-maintenance-card"
import { VehicleDocumentsCard } from "@/components/fleet/vehicle-documents-card"
import { VehicleInspectionsCard } from "@/components/fleet/vehicle-inspections-card"
import { VehicleGalleryCard } from "@/components/fleet/vehicle-gallery-card"
import { VehicleSpecCard } from "@/components/fleet/vehicle-spec-card"
import { deriveBookingHighlights } from "@/lib/fleet/booking-utils"

const referenceDate = new Date()

type PageProps = { params: Promise<{ carId: string }> }

export default async function OperationsFleetDetailPage({ params }: PageProps) {
  const { carId } = await params
  const profile = await getFleetVehicleProfile(carId)
  if (!profile) {
    notFound()
  }

  const { vehicle: car, bookings } = profile
  const { activeBooking, nextBooking, lastBooking } = deriveBookingHighlights(bookings, referenceDate)

  return (
    <DashboardPageShell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{car.name}</h1>
        </div>
        <Link href={toRoute("/fleet")} className="text-sm font-semibold text-muted-foreground hover:text-primary">
          ← Back to fleet
        </Link>
      </div>

      <VehicleProfileHero vehicle={car} />
      <VehicleStatsGrid vehicle={car} />
      <VehicleSpecCard vehicle={car} />

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <VehicleRemindersCard reminders={car.reminders} />
        <VehicleBookingsCard activeBooking={activeBooking} nextBooking={nextBooking} lastBooking={lastBooking} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <VehicleMaintenanceCard entries={car.maintenanceHistory ?? []} />
        <VehicleDocumentsCard documents={car.documents ?? []} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <VehicleInspectionsCard inspections={car.inspections ?? []} />
        <VehicleGalleryCard images={car.documentGallery ?? []} />
      </section>
    </DashboardPageShell>
  )
}

function toRoute(href: string) {
  return href as Parameters<typeof Link>[0]["href"]
}
