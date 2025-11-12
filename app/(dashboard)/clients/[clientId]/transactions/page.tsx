import Link from "next/link"
import { notFound } from "next/navigation"

import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { Button } from "@/components/ui/button"
import { NotificationFeed, PaymentPanel } from "@/components/sales-client-workspace"
import { getLiveClientByIdFromDb } from "@/lib/data/live-data"

type ClientTransactionsPageProps = {
  params: { clientId: string }
}

export default async function ClientTransactionsPage({ params }: ClientTransactionsPageProps) {
  const client = await getLiveClientByIdFromDb(params.clientId)
  if (!client) {
    notFound()
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Transactions & notifications"
        description={`Payments, invoices, and outreach history for ${client.name}`}
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
            {client.payments.length} payment{client.payments.length === 1 ? "" : "s"} tracked
          </p>
          <Button variant="ghost" size="sm" className="rounded-full" disabled>
            Filters coming soon
          </Button>
        </div>
        <PaymentPanel payments={client.payments} />
      </section>

      <section className="rounded-[26px] border border-border/70 bg-background/95 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {client.notifications.length} notification{client.notifications.length === 1 ? "" : "s"} logged
          </p>
          <Button variant="ghost" size="sm" className="rounded-full" disabled>
            Filters coming soon
          </Button>
        </div>
        <NotificationFeed notifications={client.notifications} />
      </section>
    </DashboardPageShell>
  )
}
