"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Icon, type NavIcon } from "@/components/icons"
import { cn } from "@/lib/utils"
import type { DashboardNavGroup } from "@/components/dashboard-header"

type SidebarProps = {
  navGroups: DashboardNavGroup[]
}

const toRoute = (href: string) => href as Parameters<typeof Link>[0]["href"]

function isActiveLink(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  if (pathname === href) return true
  return pathname.startsWith(`${href}/`)
}

export function DashboardSidebar({ navGroups }: SidebarProps) {
  const pathname = usePathname() ?? "/"
  const links = navGroups.flatMap((group) => group.links)
  const uniqueLinks = links.filter(
    (link, index) => links.findIndex((candidate) => candidate.href === link.href) === index
  )
  const [collapsed, setCollapsed] = useState(true)

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-shrink-0 flex-col overflow-hidden border-r border-white/10 bg-slate-900/95 text-slate-100 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:flex",
        collapsed ? "w-20" : "w-56"
      )}
      style={{
        top: 0,
        height: "100vh",
        paddingTop: "var(--dashboard-header-height, 64px)",
      }}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      <nav className="relative z-10 flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-5 pt-3">
        <div className="space-y-1">
          {uniqueLinks.map((link) => {
            const active = isActiveLink(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={toRoute(link.href)}
                aria-label={link.label}
                className={cn(
                  "group relative flex items-center overflow-hidden rounded-xl px-2.5 py-2 text-sm font-normal transition duration-150 ring-[0.7px] ring-transparent",
                  collapsed ? "justify-center gap-0" : "gap-2.5",
                  active
                    ? "bg-white/10 text-white shadow-[0_10px_40px_-24px_rgba(15,23,42,0.9)] ring-white/25"
                    : "text-slate-200 hover:bg-white/5 hover:text-white hover:ring-white/10"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-slate-200 transition",
                    active ? "text-white" : "group-hover:text-white"
                  )}
                >
                  <Icon name={link.icon} className="h-4 w-4" />
                </span>
                {!collapsed && <span className="flex-1 truncate font-normal">{link.label}</span>}
                {active && (
                  <>
                    <span
                      className="absolute inset-0 -z-10 bg-gradient-to-r from-white/10 via-white/5 to-transparent"
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "absolute h-6 w-[3px] rounded-full bg-emerald-300/90 shadow-[0_0_12px_rgba(52,211,153,0.7)]",
                        collapsed ? "right-1" : "right-2"
                      )}
                      aria-hidden
                    />
                  </>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
