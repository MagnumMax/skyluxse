import type { VehicleDocument } from "@/lib/domain/entities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/formatters"

type VehicleDocumentsCardProps = {
  documents: VehicleDocument[]
}

export function VehicleDocumentsCard({ documents }: VehicleDocumentsCardProps) {
  // Exclude gallery/photo assets so the card height matches the actual list content
  const filtered = documents.filter((doc) => doc.type !== "gallery" && doc.type !== "photo")
  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {filtered.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-border/60 px-3 py-2 text-muted-foreground">No documents</li>
          ) : (
            filtered.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="font-semibold text-foreground hover:underline">
                        {doc.name}
                      </a>
                    ) : (
                      <p className="font-semibold text-foreground">{doc.name}</p>
                    )}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {doc.type}
                    </span>
                  </div>
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
