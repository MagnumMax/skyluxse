
import type { FleetCar } from "@/lib/domain/entities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ParameterList, type ParameterListItem } from "@/components/parameter-list"
import { formatNumber } from "@/lib/formatters"

interface VehiclePricingCardProps {
  vehicle: FleetCar
}

export function VehiclePricingCard({ vehicle }: VehiclePricingCardProps) {
  const prices: ParameterListItem[] = [
    { label: "Daily Rate", value: vehicle.rentalPrices?.daily ? `${formatNumber(vehicle.rentalPrices.daily)} AED` : "—" },
    { label: "Weekly Rate", value: vehicle.rentalPrices?.weekly ? `${formatNumber(vehicle.rentalPrices.weekly)} AED` : "—" },
    { label: "Monthly Rate", value: vehicle.rentalPrices?.monthly ? `${formatNumber(vehicle.rentalPrices.monthly)} AED` : "—" },
    { label: "Min. Days", value: vehicle.rentalPrices?.minimumDays ? `${vehicle.rentalPrices.minimumDays} day(s)` : "—" },
  ]

  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Rental Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        <ParameterList items={prices} columns={4} />
      </CardContent>
    </Card>
  )
}
