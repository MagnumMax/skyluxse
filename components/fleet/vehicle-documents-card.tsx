import type { VehicleDocument } from "@/lib/domain/entities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"

type VehicleDocumentsCardProps = {
  documents: VehicleDocument[]
}

export function VehicleDocumentsCard({ documents }: VehicleDocumentsCardProps) {
  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Documents</CardTitle>
        <CardDescription>Insurance and registration statuses.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {documents.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-border/60 px-3 py-2 text-muted-foreground">No documents</li>
          ) : (
            documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-2">
                <div>
                  <p className="font-semibold text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">Expires {formatDate(doc.expiry)}</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", documentTone(doc.status))}>{doc.status}</span>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}

function documentTone(status?: string) {
  if (status === "warning" || status === "needs-review") return "bg-amber-100 text-amber-700"
  if (status === "expired") return "bg-rose-100 text-rose-700"
  return "bg-emerald-100 text-emerald-700"
}
