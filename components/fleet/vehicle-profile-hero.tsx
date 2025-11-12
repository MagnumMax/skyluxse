import type { FleetCar } from "@/lib/domain/entities"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { titleCase } from "@/lib/formatters"
import { AuditMetadata } from "@/components/audit-metadata"

const metadataClass = "rounded-full border border-border/50 px-2 py-0.5 font-semibold uppercase tracking-[0.35em]"

type VehicleProfileHeroProps = {
  vehicle: FleetCar
}

export function VehicleProfileHero({ vehicle }: VehicleProfileHeroProps) {
  return (
    <Card className="rounded-[28px] border-border/70 bg-card/80">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className={metadataClass}>{titleCase(vehicle.class)}</span>
              <span className={metadataClass}>{titleCase(vehicle.segment)}</span>
              <span className={metadataClass}>{titleCase(vehicle.color)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Plate {vehicle.plate}</span>
              {vehicle.location ? <span>Location {vehicle.location}</span> : null}
            </div>
          </div>
          <span className={cn("rounded-full border px-3 py-1 text-sm font-semibold", statusTone(vehicle.status))}>{vehicle.status}</span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-[0.35em]">Health score</span>
            <span className="text-sm font-semibold text-foreground">{Math.round(vehicle.serviceStatus.health * 100)}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-muted">
            <div
              className={cn("h-2 rounded-full", healthTone(vehicle.serviceStatus.health))}
              style={{ width: `${Math.round(vehicle.serviceStatus.health * 100)}%` }}
            />
          </div>
        </div>

        <AuditMetadata
          className="pt-1"
          createdAt={vehicle.createdAt}
          createdBy={vehicle.createdBy ?? (vehicle.kommoVehicleId ? "Kommo import" : "Manual entry")}
          updatedAt={vehicle.updatedAt ?? vehicle.serviceStatus.lastService}
          updatedBy={vehicle.updatedBy ?? vehicle.createdBy}
        />
      </CardContent>
    </Card>
  )
}

function statusTone(status: FleetCar["status"]) {
  if (status === "In Rent") return "bg-indigo-100 text-indigo-700"
  if (status === "Maintenance") return "bg-amber-100 text-amber-700"
  return "bg-emerald-100 text-emerald-700"
}

function healthTone(value: number) {
  if (value >= 0.8) return "bg-emerald-500"
  if (value >= 0.6) return "bg-amber-500"
  return "bg-rose-500"
}
