import type { Metadata, Viewport } from "next"
import { ReactNode } from "react"

import { DashboardHeader, type DashboardNavGroup } from "@/components/dashboard-header"
import { DashboardHeaderProvider } from "@/components/dashboard-header-context"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DriverHeaderActions } from "@/components/driver-header-actions"
import { ROLE_NAV_GROUPS } from "@/lib/roles"

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
}

export default function DriverLayout({ children }: { children: ReactNode }) {
  const navGroups = ROLE_NAV_GROUPS.driver

  return (
    <DashboardHeaderProvider>
      <div className="dark relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background text-foreground">
        <DashboardHeader
          navGroups={navGroups}
          className="fixed inset-x-0 top-0 z-40 w-full"
          hideBrandOnMobile
        />
        <div className="flex flex-1 min-h-0 overflow-hidden lg:pl-16">
          <DashboardSidebar navGroups={navGroups} />
          <main
            className="relative flex-1 min-h-0 overflow-y-auto border-l border-border/10 bg-background pb-8 text-foreground [--dashboard-gutter:1rem]"
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
