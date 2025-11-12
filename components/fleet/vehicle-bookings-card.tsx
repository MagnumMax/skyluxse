import Link from "next/link"

import type { Booking } from "@/lib/domain/entities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type VehicleBookingsCardProps = {
  activeBooking?: Booking
  nextBooking?: Booking
  lastBooking?: Booking
}

export function VehicleBookingsCard({ activeBooking, nextBooking, lastBooking }: VehicleBookingsCardProps) {
  return (
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
        <Link
          href={`/bookings/${String(booking.id)}?view=operations`}
          className="text-xs font-semibold text-primary hover:underline"
        >
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
