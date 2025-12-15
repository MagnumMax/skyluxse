"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"

import { useDashboardHeaderContext } from "@/components/dashboard-header-context"
import { Icon, type NavIcon } from "@/components/icons"
import { isActiveLink, toRoute } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ProfileMenu } from "@/components/profile-menu"

export type DashboardNavGroup = {
  label: string
  links: { href: string; label: string; icon: NavIcon }[]
}

type DashboardHeaderProps = {
  navGroups: DashboardNavGroup[]
  className?: string
  hideBrandOnMobile?: boolean
}

export function DashboardHeader({ navGroups, className, hideBrandOnMobile }: DashboardHeaderProps) {
  const headerRef = useRef<HTMLElement | null>(null)
  const headerContext = useDashboardHeaderContext()
  const contextualContent = headerContext?.contextualContent

  useEffect(() => {
    const node = headerRef.current
    if (!node || typeof window === "undefined") return

    const root = document.documentElement
    const updateHeight = () => {
      const height = node.getBoundingClientRect().height
      root.style.setProperty("--dashboard-header-height", `${height}px`)
    }

    updateHeight()

    let observer: ResizeObserver | undefined
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateHeight())
      observer.observe(node)
    }

    return () => {
      observer?.disconnect()
      root.style.removeProperty("--dashboard-header-height")
    }
  }, [])

  return (
    <header
      ref={headerRef}
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-950 px-4 py-3 text-slate-50 shadow-[0_16px_50px_-28px_rgba(0,0,0,0.6)] lg:px-4",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <MobileNav navGroups={navGroups} />
        <div className={cn(hideBrandOnMobile && "hidden md:block")}>
          <Image
            src="/skyluxse_logo.png"
            alt="SkyLuxse ERP"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-3 min-w-0">
        {contextualContent ? (
          <div className="flex w-full min-w-[240px] flex-1 flex-wrap items-center justify-end gap-2 lg:justify-end">
            {contextualContent}
          </div>
        ) : null}
      </div>
    </header>
  )
}

function MobileNav({ navGroups }: { navGroups: DashboardNavGroup[] }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname() ?? "/"
  const uniqueLinks = useMemo(() => {
    const links = navGroups.flatMap((group) => group.links)
    return links.filter((link, index) => links.findIndex((candidate) => candidate.href === link.href) === index)
  }, [navGroups])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full border-white/15 bg-white/5 text-slate-50 shadow-none hover:border-white/25 hover:bg-white/10 lg:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-full max-w-sm flex-col gap-0 border border-white/10 bg-slate-950/95 p-0 text-slate-50 shadow-[0_22px_65px_-28px_rgba(0,0,0,0.65)]"
      >
        <SheetHeader className="border-b border-white/10 px-6 py-4 text-left">
          <SheetTitle className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            SkyLuxse ERP
          </SheetTitle>
          <SheetDescription className="sr-only">
            Dashboard navigation menu with quick access to fleet, clients, and tasks.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
          {uniqueLinks.map((link) => {
            const active = isActiveLink(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={toRoute(link.href)}
                onClick={() => setOpen(false)}
                className={cn(
                  "group relative flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm font-medium transition",
                  active
                    ? "border-white/25 bg-white/10 text-white shadow-[0_12px_38px_-26px_rgba(15,23,42,0.9)]"
                    : "border-white/5 bg-white/0 text-slate-100 hover:border-white/15 hover:bg-white/5"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-slate-200 transition",
                    active ? "bg-white/15 text-white" : "group-hover:bg-white/10 group-hover:text-white"
                  )}
                >
                  <Icon name={link.icon} className="h-4 w-4" />
                </span>
                <span className="flex-1 truncate">{link.label}</span>
                {active && (
                  <span
                    className="absolute inset-y-1 right-1.5 w-[3px] rounded-full bg-emerald-300/90 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
                    aria-hidden
                  />
                )}
              </Link>
            )
          })}
        </div>
        <div className="border-t border-white/10 bg-white/5 px-6 py-5">
          <ProfileMenu placement="top" onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
