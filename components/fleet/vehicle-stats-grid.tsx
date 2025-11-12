import type { FleetCar } from "@/lib/domain/entities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ParameterList, type ParameterListItem } from "@/components/parameter-list"
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters"

export function VehicleStatsGrid({ vehicle }: { vehicle: FleetCar }) {
  const stats: ParameterListItem[] = [
    { label: "Utilisation", value: `${Math.round(vehicle.utilization * 100)}%` },
    { label: "Mileage", value: `${formatNumber(vehicle.mileage)} km` },
    { label: "Revenue YTD", value: formatCurrency(vehicle.revenueYTD) },
    {
      label: "Next service",
      value: formatDate(vehicle.serviceStatus.nextService),
      helper: `${formatNumber(vehicle.serviceStatus.mileageToService)} km to go`,
    },
  ]

  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Performance snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        <ParameterList items={stats} columns={2} valueSize="lg" />
      </CardContent>
    </Card>
  )
}
