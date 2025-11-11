import type { Metadata } from "next"
import Link from "next/link"
import { ReactNode } from "react"

import { Icon, type NavIcon } from "@/components/icons"
import { DashboardHeader, type DashboardNavGroup, type HeaderMeta } from "@/components/dashboard-header"

type NavLink = {
  href: string
  label: string
  icon: NavIcon
}

const navGroups: DashboardNavGroup[] = [
  {
    label: "Operations",
    links: [
      { href: "/operations/fleet-calendar", label: "Fleet calendar", icon: "calendar" },
      { href: "/operations/tasks", label: "Tasks", icon: "tasks" },
      { href: "/operations/fleet", label: "Fleet", icon: "fleet" },
    ],
  },
  {
    label: "Sales",
    links: [
      { href: "/sales/bookings", label: "Bookings", icon: "dashboard" },
      { href: "/sales/clients", label: "Clients", icon: "clients" },
      { href: "/sales/analytics", label: "Analytics", icon: "analytics" },
    ],
  },
  {
    label: "Executive",
    links: [
      { href: "/exec/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/exec/reports", label: "Reports", icon: "reports" },
      { href: "/exec/analytics", label: "Analytics", icon: "analytics" },
    ],
  },
  {
    label: "Integrations",
    links: [{ href: "/exec/integrations", label: "Outbox", icon: "integrations" }],
  },
]

const headerMeta: HeaderMeta[] = [
  {
    pattern: "/operations/fleet-calendar",
    title: "Fleet calendar",
    subtitle: "Layers: rental, maintenance, repair",
  },
  {
    pattern: "/operations/tasks",
    title: "Operations tasks",
    subtitle: "Backlog · In progress · Completed",
  },
  {
    pattern: "/operations/tasks/[taskId]",
    title: "Task detail",
    subtitle: "Checklist, SLA, booking context",
  },
  {
    pattern: "/operations/fleet",
    title: "Fleet overview",
    subtitle: "Vehicles, compliance, reminders",
  },
  {
    pattern: "/operations/fleet/[carId]",
    title: "Vehicle profile",
    subtitle: "Health, bookings, inspections",
  },
  {
    pattern: "/operations/fleet/new",
    title: "Vehicle intake",
    subtitle: "Capture VIN, specs, documents",
  },
  {
    pattern: "/operations/maintenance/new",
    title: "Maintenance automation",
    subtitle: "Triggers, reminders, vendors",
  },
  {
    pattern: "/operations/bookings/new",
    title: "Manual booking",
    subtitle: "Client, vehicle, SLA inputs",
  },
  {
    pattern: "/operations/bookings/[bookingId]",
    title: "Booking detail",
    subtitle: "Schedule, financials, timeline",
  },
  {
    pattern: "/operations/documents/[docId]",
    title: "Document viewer",
    subtitle: "Metadata, owner, expiry",
  },
  {
    pattern: "/sales/bookings",
    title: "Sales bookings",
    subtitle: "Lifecycle board and filters",
  },
  {
    pattern: "/sales/bookings/[bookingId]",
    title: "Sales booking detail",
    subtitle: "AI copilot, conflicts, payments",
  },
  {
    pattern: "/sales/clients",
    title: "Clients",
    subtitle: "Table filters, dossier tabs",
  },
  {
    pattern: "/sales/clients/[clientId]",
    title: "Client workspace",
    subtitle: "Documents, rentals, payments",
  },
  {
    pattern: "/sales/analytics",
    title: "Sales analytics",
    subtitle: "Pipeline, manager vs. source",
  },
  {
    pattern: "/sales/fleet-calendar",
    title: "Sales fleet calendar",
    subtitle: "Conflicts and delivery slots",
  },
  {
    pattern: "/exec/dashboard",
    title: "Executive dashboard",
    subtitle: "KPIs, SLA, driver performance",
  },
  {
    pattern: "/exec/analytics",
    title: "Executive analytics",
    subtitle: "Insights and trendlines",
  },
  {
    pattern: "/exec/reports",
    title: "Executive reports",
    subtitle: "Financial and top vehicles",
  },
  {
    pattern: "/exec/bookings",
    title: "Executive bookings",
    subtitle: "Read-only lifecycle board",
  },
  {
    pattern: "/exec/bookings/[bookingId]",
    title: "Executive booking detail",
    subtitle: "KPI highlights, SLA state",
  },
  {
    pattern: "/exec/fleet-calendar",
    title: "Executive fleet calendar",
    subtitle: "Utilisation snapshot",
  },
  {
    pattern: "/exec/integrations",
    title: "Integrations outbox",
    subtitle: "Kommo runs & Zoho jobs",
  },
  {
    pattern: "*",
    title: "SkyLuxse ERP",
    subtitle: "Automation hub for premium fleet",
  },
]

const toRoute = (href: string) => href as Parameters<typeof Link>[0]["href"]

export const metadata: Metadata = {
  title: {
    default: "SkyLuxse ERP",
    template: "%s · SkyLuxse ERP",
  },
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/40 text-foreground">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <DashboardHeader navGroups={navGroups} className="sticky top-0 z-30" meta={headerMeta} />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-10">{children}</main>
      </div>
    </div>
  )
}

function DesktopSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col overflow-hidden border-r border-border/60 bg-card/90 backdrop-blur lg:flex">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <p className="text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            SkyLuxse
          </p>
          <p className="text-xl font-semibold tracking-tight">ERP 2.0</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-6">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.45em] text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={toRoute(link.href)}
                  className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-border/70 hover:bg-muted/50 hover:text-foreground"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon name={link.icon} className="h-4 w-4" />
                  </span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border/60 px-4 py-5">
        <div className="rounded-2xl border border-border/60 bg-background/90 p-3">
          <p className="text-xs font-semibold text-foreground">Anna Koval</p>
          <p className="text-[11px] text-muted-foreground">Head of Operations</p>
          <button className="mt-3 w-full rounded-xl border border-border/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary">
            Switch role
          </button>
        </div>
      </div>
    </aside>
  )
}
