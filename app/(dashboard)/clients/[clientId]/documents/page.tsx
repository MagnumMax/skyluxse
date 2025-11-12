import Link from "next/link"
import { notFound } from "next/navigation"

import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { Button } from "@/components/ui/button"
import { DocumentList } from "@/components/sales-client-workspace"
import { getLiveClientByIdFromDb } from "@/lib/data/live-data"

type ClientDocumentsPageProps = {
  params: { clientId: string }
}

export default async function ClientDocumentsPage({ params }: ClientDocumentsPageProps) {
  const client = await getLiveClientByIdFromDb(params.clientId)
  if (!client) {
    notFound()
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Documents"
        description={`Complete dossier for ${client.name}`}
        actions={
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href={`/clients/${client.id}`} prefetch={false}>
              Back to client
            </Link>
          </Button>
        }
      />

      <section className="rounded-[26px] border border-border/70 bg-background/95 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {client.documents.length} file{client.documents.length === 1 ? "" : "s"}
          </p>
          <Button variant="ghost" size="sm" className="rounded-full" disabled>
            Filters coming soon
          </Button>
        </div>
        <DocumentList documents={client.documents} />
      </section>
    </DashboardPageShell>
  )
}
