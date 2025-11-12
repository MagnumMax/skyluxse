import type { VehicleMaintenanceEntry } from "@/lib/domain/entities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatNumber } from "@/lib/formatters"

type VehicleMaintenanceCardProps = {
  entries: VehicleMaintenanceEntry[]
}

export function VehicleMaintenanceCard({ entries }: VehicleMaintenanceCardProps) {
  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Maintenance history</CardTitle>
        <CardDescription>Chronology of recent service visits.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {entries.length === 0 ? (
            <li className="text-muted-foreground">No maintenance records</li>
          ) : (
            entries.map((entry) => (
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
  )
}
