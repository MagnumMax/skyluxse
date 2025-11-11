import type { Client } from "@/lib/domain/entities"
import Link from "next/link"

import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { ClientAiPanel } from "./sales-client-ai-panel"

export function SalesClientWorkspace({ client }: { client: Client }) {
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title={client.name}
        description={`${client.segment} · ${client.status} · ${client.residencyCountry || "Unknown"}`}
        meta={
          <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Outstanding</p>
            <p className="text-xl font-semibold text-foreground">AED {client.outstanding.toLocaleString()}</p>
          </div>
        }
        align="between"
      />

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>Phone: {client.phone}</span>
        <span>•</span>
        <span>Email: {client.email}</span>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-[26px] border border-border/70 bg-background/90 p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">Documents & rentals</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Documents</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {client.documents.map((doc) => (
                  <li key={doc.id} className="rounded-2xl border border-border/60 px-3 py-2">
                    <p className="flex items-center justify-between text-sm font-medium text-foreground">
                      <span>{doc.name}</span>
                      <span className="text-xs text-muted-foreground/80">{doc.status}</span>
                    </p>
                    {doc.expiry ? <p className="text-xs text-muted-foreground">Expires {doc.expiry}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent rentals</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {client.rentals.map((rental) => (
                  <li key={rental.bookingId} className="rounded-2xl border border-border/60 px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{rental.carName}</p>
                    <p className="text-xs text-muted-foreground">
                      {rental.startDate} – {rental.endDate} · AED {rental.totalAmount.toLocaleString()}
                    </p>
                    <Link href={toRoute(`/operations/bookings/${rental.bookingId}`)} className="text-xs text-primary hover:underline">
                      View booking #{rental.bookingCode ?? rental.bookingId}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>

        <article className="rounded-[26px] border border-border/70 bg-background/90 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Payments & notifications</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {client.payments.map((payment) => (
              <li key={payment.id} className="rounded-2xl border border-border/60 px-3 py-2">
                <p className="flex items-center justify-between text-sm font-medium text-foreground">
                  <span>AED {payment.amount.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">{payment.status}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.type} via {payment.channel} on {payment.date}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Recent notifications</p>
            {client.notifications.map((notification) => (
              <div key={notification.id} className="rounded-2xl border border-border/60 px-3 py-2">
                <p className="flex items-center justify-between text-sm font-medium text-foreground">
                  <span>{notification.subject}</span>
                  <span className="text-[11px] text-muted-foreground">{notification.channel}</span>
                </p>
                <p>{new Date(notification.date).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <ClientAiPanel
        clientName={client.name}
        segment={client.segment}
        outstanding={client.outstanding}
        preferences={client.preferences}
      />
    </DashboardPageShell>
  )
}

function toRoute(path: string) {
  return path as Parameters<typeof Link>[0]["href"]
}
