import Image from "next/image"

import type { VehicleInspection } from "@/lib/domain/entities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/formatters"

type VehicleInspectionsCardProps = {
  inspections?: VehicleInspection[]
}

export function VehicleInspectionsCard({ inspections = [] }: VehicleInspectionsCardProps) {
  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Inspection highlights</CardTitle>
        <CardDescription>Driver notes and inspection photos.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {inspections.length === 0 ? (
            <li className="text-muted-foreground">No inspections recorded</li>
          ) : (
            inspections.map((inspection, index) => (
              <li key={`${inspection.date}-${index}`} className="rounded-2xl border border-border/60 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatDate(inspection.date)}</span>
                  {inspection.performedBy ? <span>Driver {inspection.performedBy}</span> : inspection.driver ? <span>Driver {inspection.driver}</span> : null}
                </div>
                {inspection.notes ? <p className="mt-2 text-xs text-muted-foreground">{inspection.notes}</p> : null}
                {inspection.photos && inspection.photos.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {inspection.photos.map((photo) => (
                      <Image key={photo} src={photo} alt="Inspection photo" width={160} height={160} className="h-16 w-full rounded object-cover" />
                    ))}
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
