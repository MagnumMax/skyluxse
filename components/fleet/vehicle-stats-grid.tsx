import type { FleetCar } from "@/lib/domain/entities"
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters"

export function VehicleStatsGrid({ vehicle }: { vehicle: FleetCar }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Stat label="Utilisation" value={`${Math.round(vehicle.utilization * 100)}%`} />
      <Stat label="Mileage" value={`${formatNumber(vehicle.mileage)} km`} />
      <Stat label="Revenue YTD" value={formatCurrency(vehicle.revenueYTD)} />
      <Stat
        label="Next service"
        value={formatDate(vehicle.serviceStatus.nextService)}
        helper={`${formatNumber(vehicle.serviceStatus.mileageToService)} km to go`}
      />
    </div>
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
