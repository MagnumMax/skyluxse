import type { Metadata } from "next"
import { ReactNode } from "react"

import { DashboardHeader, type DashboardNavGroup, type HeaderMeta } from "@/components/dashboard-header"
import { DashboardHeaderProvider } from "@/components/dashboard-header-context"
import { DashboardSidebar } from "@/components/dashboard-sidebar"

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

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: {
    default: "SkyLuxse ERP",
    template: "%s · SkyLuxse ERP",
  },
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardHeaderProvider>
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-50 text-slate-900">
        <DashboardHeader navGroups={navGroups} className="fixed inset-x-0 top-0 z-40 w-full" meta={headerMeta} />
        <div className="flex flex-1 min-h-0 overflow-hidden lg:pl-20">
          <DashboardSidebar navGroups={navGroups} />
          <main
            className="relative flex-1 min-h-0 overflow-y-auto border-l border-white/70 bg-white px-4 py-8 lg:px-12"
            style={{ paddingTop: "var(--dashboard-header-height, 64px)" }}
          >
            {children}
          </main>
        </div>
      </div>
    </DashboardHeaderProvider>
  )
}
