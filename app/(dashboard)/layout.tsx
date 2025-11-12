import type { Metadata } from "next"
import Link from "next/link"
import { ReactNode } from "react"

import { Icon, type NavIcon } from "@/components/icons"
import { DashboardHeader, type DashboardNavGroup, type HeaderMeta } from "@/components/dashboard-header"
import { ProfileMenu } from "@/components/profile-menu"

type NavLink = {
  href: string
  label: string
  icon: NavIcon
}

const navGroups: DashboardNavGroup[] = [
  {
    label: "Operations",
    links: [
      { href: "/fleet-calendar", label: "Fleet calendar", icon: "calendar" },
      { href: "/tasks", label: "Tasks", icon: "tasks" },
      { href: "/fleet", label: "Fleet", icon: "fleet" },
    ],
  },
  {
    label: "Sales",
    links: [
      { href: "/fleet-calendar", label: "Fleet calendar", icon: "calendar" },
      { href: "/bookings", label: "Bookings", icon: "dashboard" },
      { href: "/clients", label: "Clients", icon: "clients" },
      { href: "/analytics", label: "Analytics", icon: "analytics" },
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
    pattern: "/fleet-calendar",
    title: "Fleet calendar",
  },
  {
    pattern: "/tasks",
    title: "Operations tasks",
  },
  {
    pattern: "/tasks/[taskId]",
    title: "Task detail",
  },
  {
    pattern: "/fleet",
    title: "Fleet overview",
  },
  {
    pattern: "/fleet/[carId]",
    title: "Vehicle profile",
  },
  {
    pattern: "/fleet/new",
    title: "Vehicle intake",
  },
  {
    pattern: "/maintenance/new",
    title: "Maintenance automation",
  },
  {
    pattern: "/bookings/new",
    title: "Manual booking",
  },
  {
    pattern: "/documents/[docId]",
    title: "Document viewer",
  },
  {
    pattern: "/bookings",
    title: "Sales bookings",
  },
  {
    pattern: "/bookings/[bookingId]",
    title: "Sales booking detail",
  },
  {
    pattern: "/clients",
    title: "Clients",
  },
  {
    pattern: "/clients/[clientId]",
    title: "Client workspace",
  },
  {
    pattern: "/analytics",
    title: "Sales analytics",
  },
  {
    pattern: "/exec/dashboard",
    title: "Executive dashboard",
  },
  {
    pattern: "/exec/analytics",
    title: "Executive analytics",
  },
  {
    pattern: "/exec/reports",
    title: "Executive reports",
  },
  {
    pattern: "/exec/fleet-calendar",
    title: "Executive fleet calendar",
  },
  {
    pattern: "/exec/integrations",
    title: "Integrations outbox",
  },
  {
    pattern: "*",
    title: "SkyLuxse ERP",
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
        <ProfileMenu placement="top" />
      </div>
    </aside>
  )
}
