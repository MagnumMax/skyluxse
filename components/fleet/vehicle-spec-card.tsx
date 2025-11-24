import type { FleetCar } from "@/lib/domain/entities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ParameterList, type ParameterListItem } from "@/components/parameter-list"
import { formatNumber, titleCase } from "@/lib/formatters"

interface VehicleSpecCardProps {
  vehicle: FleetCar
}

export function VehicleSpecCard({ vehicle }: VehicleSpecCardProps) {
  const specs: ParameterListItem[] = [
    { label: "Make", value: vehicle.make },
    { label: "Model", value: vehicle.model },
    { label: "VIN", value: vehicle.vin },
    { label: "Plate", value: vehicle.plate },
    { label: "Year", value: vehicle.year },
    { label: "Body style", value: vehicle.bodyStyle },
    { label: "Exterior colour", value: vehicle.color },
    { label: "Interior colour", value: vehicle.interiorColor },
    { label: "Seating", value: vehicle.seatingCapacity != null ? `${vehicle.seatingCapacity}` : undefined },
    {
      label: "Engine",
      value: vehicle.engineDisplacementL ? `${vehicle.engineDisplacementL.toFixed(1)} L` : undefined,
    },
    { label: "Power", value: vehicle.powerHp ? `${formatNumber(vehicle.powerHp)} hp` : undefined },
    { label: "Cylinders", value: vehicle.cylinders },
    {
      label: "0-100 km/h",
      value: vehicle.zeroToHundredSec ? `${vehicle.zeroToHundredSec.toFixed(1)} s` : undefined,
    },
    { label: "Transmission", value: vehicle.transmission ? titleCase(vehicle.transmission) : undefined },
  ]

  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Vehicle specs</CardTitle>
      </CardHeader>
      <CardContent>
        <ParameterList items={specs} columns={2} />
      </CardContent>
    </Card>
  )
}
