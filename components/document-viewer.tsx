import Image from "next/image"
import Link from "next/link"

import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export type ResolvedDocument = {
  id: string
  name?: string
  type: string
  status?: string
  expiry?: string
  previewUrl?: string
  entityLabel: string
  entityLink?: string
  entityType: string
}

export function DocumentViewer({ doc }: { doc: ResolvedDocument }) {
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title={doc.name ?? doc.type}
        description={`Linked to ${doc.entityType}: ${doc.entityLabel}`}
        meta={
          <span className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
            #{doc.id}
          </span>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[28px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Preview</CardTitle>
            <CardDescription>Read-only document lightbox placeholder.</CardDescription>
          </CardHeader>
          <CardContent>
            {doc.previewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted">
                <Image src={doc.previewUrl} alt={doc.name ?? doc.type} width={960} height={540} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-12 text-center text-sm text-muted-foreground">
                No preview available
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" variant="default" className="rounded-full">Download</Button>
              <Button type="button" variant="outline" className="rounded-full">Request re-upload</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Metadata</CardTitle>
            <CardDescription>Expiry, status, and link back to the owning record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="font-semibold text-foreground">Type:</span> {doc.type}</p>
            <p><span className="font-semibold text-foreground">Status:</span> {doc.status ?? "—"}</p>
            <p><span className="font-semibold text-foreground">Expiry:</span> {doc.expiry ?? "—"}</p>
            <p><span className="font-semibold text-foreground">Entity:</span> {doc.entityLabel}</p>
            {doc.entityLink ? (
              <Link href={toRoute(doc.entityLink)} className="text-xs font-semibold text-primary hover:underline">
                Open related record →
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </DashboardPageShell>
  )
}

function toRoute(path: string) {
  return path as Parameters<typeof Link>[0]["href"]
}
