import type { Metadata } from "next"
import { ReactNode } from "react"

import { DashboardHeader, type DashboardNavGroup } from "@/components/dashboard-header"
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
        <DashboardHeader navGroups={navGroups} className="fixed inset-x-0 top-0 z-40 w-full" />
        <div className="flex flex-1 min-h-0 overflow-hidden lg:pl-16">
          <DashboardSidebar navGroups={navGroups} />
          <main
            className="relative flex-1 min-h-0 overflow-y-auto border-l border-white/70 bg-white pb-8 [--dashboard-gutter:1rem]"
            style={{
              paddingTop: "calc(var(--dashboard-header-height, 64px) + var(--dashboard-gutter, 1rem))",
              paddingInline: "var(--dashboard-gutter, 1rem)",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </DashboardHeaderProvider>
  )
}
