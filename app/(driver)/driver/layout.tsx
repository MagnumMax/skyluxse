import type { Metadata, Viewport } from "next"
import { ReactNode } from "react"

import { DashboardHeader, type DashboardNavGroup } from "@/components/dashboard-header"
import { DashboardHeaderProvider } from "@/components/dashboard-header-context"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DriverHeaderActions } from "@/components/driver-header-actions"

const navGroups: DashboardNavGroup[] = [
  {
    label: "Driver",
    links: [{ href: "/driver/tasks", label: "Tasks", icon: "tasks" }],
  },
]

export const metadata: Metadata = {
  title: {
    default: "SkyLuxse Driver",
    template: "%s · Driver · SkyLuxse",
  },
}

export const dynamic = "force-dynamic"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardHeaderProvider>
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-50 text-slate-900">
        <DashboardHeader
          navGroups={navGroups}
          className="fixed inset-x-0 top-0 z-40 w-full"
          hideBrandOnMobile
        />
        <div className="flex flex-1 min-h-0 overflow-hidden lg:pl-16">
          <DashboardSidebar navGroups={navGroups} />
          <main
            className="relative flex-1 min-h-0 overflow-y-auto border-l border-white/10 bg-slate-950 pb-8 text-white [--dashboard-gutter:1rem]"
            style={{
              paddingTop: "calc(var(--dashboard-header-height, 64px) + var(--dashboard-gutter, 1rem))",
              paddingInline: "var(--dashboard-gutter, 1rem)",
            }}
          >
            <DriverHeaderActions />
            {children}
          </main>
        </div>
      </div>
    </DashboardHeaderProvider>
  )
}
