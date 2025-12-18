import type { Metadata } from "next"
import { ReactNode } from "react"

import { cookies } from "next/headers"
import { ROLE_NAV_GROUPS, UserRole } from "@/lib/roles"

import { DashboardHeader, type DashboardNavGroup } from "@/components/dashboard-header"
import { DashboardHeaderProvider } from "@/components/dashboard-header-context"
import { DashboardSidebar } from "@/components/dashboard-sidebar"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: {
    default: "SkyLuxse ERP",
    template: "%s · SkyLuxse ERP",
  },
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const role = (cookieStore.get("skyluxse_role")?.value as UserRole) ?? "operations"
  const navGroups = ROLE_NAV_GROUPS[role] ?? ROLE_NAV_GROUPS.operations

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
