import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import type { Booking, FleetCar } from "@/lib/domain/entities"
import { getLiveBookings, getLiveFleetVehicleById } from "@/lib/data/live-data"
import { cn } from "@/lib/utils"
import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const referenceDate = new Date()

export default async function OperationsFleetDetailPage({ params }: { params: { carId: string } }) {
  const [car, bookings] = await Promise.all([getLiveFleetVehicleById(params.carId), getLiveBookings()])
  if (!car) {
    notFound()
  }

  const carBookings = bookings.filter((booking) => String(booking.carId) === String(car.id))
  const { activeBooking, nextBooking, lastBooking } = deriveBookings(carBookings)

  return (
    <DashboardPageShell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{car.name}</h1>
        </div>
        <Link href={toRoute("/operations/fleet") } className="text-sm font-semibold text-muted-foreground hover:text-primary">
          ← Back to fleet
        </Link>
      </div>

      <Card className="rounded-[28px] border-border/70 bg-card/80">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/50 px-2 py-0.5 font-semibold uppercase tracking-[0.35em]">{car.class}</span>
                <span className="rounded-full border border-border/50 px-2 py-0.5 font-semibold uppercase tracking-[0.35em]">{car.segment}</span>
                <span className="rounded-full border border-border/50 px-2 py-0.5 font-semibold uppercase tracking-[0.35em]">{car.color}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Plate {car.plate}</span>
                <span>Location {car.location}</span>
              </div>
            </div>
            <span className={cn("rounded-full border px-3 py-1 text-sm font-semibold", statusTone(car.status))}>{car.status}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Stat label="Utilisation" value={`${Math.round(car.utilization * 100)}%`} />
            <Stat label="Mileage" value={`${formatNumber(car.mileage)} km`} />
            <Stat label="Revenue YTD" value={formatCurrency(car.revenueYTD)} />
            <Stat label="Next service" value={formatDate(car.serviceStatus.nextService)} helper={`${car.serviceStatus.mileageToService} km to go`} />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-[0.35em]">Health score</span>
              <span className="text-sm font-semibold text-foreground">{Math.round(car.serviceStatus.health * 100)}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className={cn("h-2 rounded-full", healthTone(car.serviceStatus.health))}
                style={{ width: `${Math.round(car.serviceStatus.health * 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Reminders</CardTitle>
            <CardDescription>Expiry and maintenance alerts for this vehicle.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {car.reminders.length === 0 ? (
                <li className="text-muted-foreground">No active reminders</li>
              ) : (
                car.reminders.map((reminder) => (
                  <li key={reminder.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{titleCase(reminder.type)}</p>
                      <p className="text-xs text-muted-foreground">Due {formatDate(reminder.dueDate)}</p>
                    </div>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", reminderTone(reminder.status))}>{reminder.status}</span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Bookings</CardTitle>
            <CardDescription>Active, upcoming, and recent rentals with quick summaries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <BookingCard label="In progress" booking={activeBooking} />
            <BookingCard label="Next booking" booking={nextBooking} subtle />
            <BookingCard label="Last booking" booking={lastBooking} subtle />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Maintenance history</CardTitle>
            <CardDescription>Chronology of recent service visits.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {(car.maintenanceHistory ?? []).length === 0 ? (
                <li className="text-muted-foreground">No maintenance records</li>
              ) : (
                car.maintenanceHistory!.map((entry) => (
                  <li key={entry.id} className="rounded-2xl border border-border/60 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{entry.type}</span>
                      <span>{formatDate(entry.date)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Odometer</span>
                      <span>{entry.odometer != null ? `${formatNumber(entry.odometer)} km` : "—"}</span>
                    </div>
                    {entry.notes ? <p className="mt-2 text-xs text-muted-foreground">{entry.notes}</p> : null}
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Documents</CardTitle>
            <CardDescription>Insurance and registration statuses.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {car.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-2">
                  <div>
                    <p className="font-semibold text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">Expires {formatDate(doc.expiry)}</p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", documentTone(doc.status))}>{doc.status}</span>
                </li>
              ))}
            </ul>
            {(car.documentGallery ?? []).length ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {car.documentGallery!.map((image) => (
                  <div key={image} className="overflow-hidden rounded-2xl border border-border/60 bg-muted/50">
                    <Image src={image} alt="Document" width={320} height={180} className="h-32 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Inspection highlights</CardTitle>
            <CardDescription>Driver notes and inspection photos.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {(car.inspections ?? []).length === 0 ? (
                <li className="text-muted-foreground">No inspections recorded</li>
              ) : (
                car.inspections!.map((inspection, index) => (
                  <li key={`${inspection.date}-${index}`} className="rounded-2xl border border-border/60 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{formatDate(inspection.date)}</span>
                      {inspection.driver ? <span>Driver {inspection.driver}</span> : null}
                    </div>
                    {inspection.notes ? <p className="mt-2 text-xs text-muted-foreground">{inspection.notes}</p> : null}
                    {inspection.photos && inspection.photos.length ? (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {inspection.photos.map((photo) => (
                          <Image
                            key={photo}
                            src={photo}
                            alt="Inspection photo"
                            width={160}
                            height={160}
                            className="h-16 w-full rounded object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Gallery</CardTitle>
            <CardDescription>Preview thumbnails for uploaded files.</CardDescription>
          </CardHeader>
          <CardContent>
            {(car.documentGallery ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No media</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {car.documentGallery!.map((image) => (
                  <div key={`gallery-${image}`} className="overflow-hidden rounded-2xl border border-border/60 bg-muted/50">
                    <Image src={image} alt="Vehicle media" width={320} height={180} className="h-32 w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </DashboardPageShell>
  )
}

function Stat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
      <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}

function BookingCard({ label, booking, subtle }: { label: string; booking?: Booking; subtle?: boolean }) {
  if (!booking) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
        {label}: Not available
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        subtle ? "border-border/50 bg-background/60" : "border-border/70 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
          <p className="text-base font-semibold text-foreground">{booking.clientName}</p>
        </div>
        <Link href={toRoute(`/operations/bookings/${booking.id}`)} className="text-xs font-semibold text-primary hover:underline">
          Open
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>Status {booking.status}</span>
        <span>
          {booking.startDate} → {booking.endDate}
        </span>
      </div>
    </div>
  )
}

function deriveBookings(carBookings: Booking[]) {
  const sortedByStart = [...carBookings].sort(
    (a, b) => getStart(a).getTime() - getStart(b).getTime()
  )
  const activeBooking = sortedByStart.find((booking) => {
    const start = getStart(booking)
    const end = getEnd(booking)
    return booking.status === "in-rent" || (referenceDate >= start && referenceDate <= end)
  })
  const upcoming = sortedByStart.filter((booking) => getStart(booking) > referenceDate)
  const past = [...carBookings]
    .filter((booking) => getEnd(booking) < referenceDate)
    .sort((a, b) => getEnd(b).getTime() - getEnd(a).getTime())

  const nextBooking = activeBooking ? upcoming.find((booking) => booking.id !== activeBooking.id) : upcoming[0]
  const lastBooking = activeBooking ? past.find((booking) => booking.id !== activeBooking.id) : past[0]

  return { activeBooking, nextBooking, lastBooking }
}

function getStart(booking: Booking) {
  return new Date(`${booking.startDate}T${booking.startTime}:00Z`)
}

function getEnd(booking: Booking) {
  return new Date(`${booking.endDate}T${booking.endTime}:00Z`)
}

function formatNumber(value?: number) {
  if (!value && value !== 0) return "—"
  return new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(value)
}

function formatCurrency(value?: number) {
  if (!value && value !== 0) return "—"
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(value)
}

function formatDate(value?: string) {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(new Date(value))
  } catch {
    return value
  }
}

function titleCase(value?: string) {
  if (!value) return "Reminder"
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function statusTone(status: FleetCar["status"]) {
  if (status === "In Rent") return "bg-indigo-100 text-indigo-700"
  if (status === "Maintenance") return "bg-amber-100 text-amber-700"
  return "bg-emerald-100 text-emerald-700"
}

function reminderTone(status?: string) {
  if (status === "critical") return "bg-rose-100 text-rose-700"
  if (status === "warning") return "bg-amber-100 text-amber-700"
  return "bg-slate-100 text-slate-700"
}

function documentTone(status?: string) {
  if (status === "warning" || status === "needs-review") return "bg-amber-100 text-amber-700"
  if (status === "expired") return "bg-rose-100 text-rose-700"
  return "bg-emerald-100 text-emerald-700"
}

function healthTone(value: number) {
  if (value >= 0.8) return "bg-emerald-500"
  if (value >= 0.6) return "bg-amber-500"
  return "bg-rose-500"
}

function toRoute(href: string) {
  return href as Parameters<typeof Link>[0]["href"]
}
