"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"

import { useDashboardHeaderContext } from "@/components/dashboard-header-context"
import { Icon, type NavIcon } from "@/components/icons"
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

export type HeaderMeta = {
  pattern: string
  title: string
}

type DashboardHeaderProps = {
  navGroups: DashboardNavGroup[]
  className?: string
  meta?: HeaderMeta[]
}

const toRoute = (href: string) => href as Parameters<typeof Link>[0]["href"]

const defaultMeta: HeaderMeta = {
  pattern: "*",
  title: "SkyLuxse ERP",
}

function matchPattern(pathname: string, pattern: string) {
  if (pattern === "*") return true

  const normalize = (value: string) => {
    if (value === "/") return "/"
    return value.replace(/\/+$/, "")
  }

  const path = normalize(pathname)
  const target = normalize(pattern)

  const pathSegments = path === "/" ? [] : path.split("/").filter(Boolean)
  const patternSegments = target === "/" ? [] : target.split("/").filter(Boolean)

  if (pathSegments.length !== patternSegments.length) return false

  return patternSegments.every((segment, index) => {
    if (segment.startsWith("[") && segment.endsWith("]")) return true
    return segment === pathSegments[index]
  })
}

export function DashboardHeader({ navGroups, className, meta = [defaultMeta] }: DashboardHeaderProps) {
  const pathname = usePathname() ?? "/"
  const currentMeta = useMemo(() => {
    return meta.find((entry) => matchPattern(pathname, entry.pattern)) ?? defaultMeta
  }, [meta, pathname])
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
        <div className="flex flex-col gap-1">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-slate-400">
            SkyLuxse ERP
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 lg:text-2xl">{currentMeta.title}</h1>
        </div>
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-3 min-w-0">
        {contextualContent ? (
          <div className="flex w-full min-w-[240px] flex-1 flex-wrap items-center justify-end gap-2 lg:justify-end">
            {contextualContent}
          </div>
        ) : null}
        <ProfileMenu placement="bottom-end" />
      </div>
    </header>
  )
}

function MobileNav({ navGroups }: { navGroups: DashboardNavGroup[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full border-border/60 lg:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-full max-w-sm flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border/60 px-6 py-4 text-left">
          <SheetTitle className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            SkyLuxse ERP
          </SheetTitle>
          <SheetDescription className="sr-only">
            Dashboard navigation menu with quick access to fleet, clients, and tasks.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={toRoute(link.href)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm font-semibold text-foreground",
                      "hover:border-border/70 hover:bg-muted/60"
                    )}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                      <Icon name={link.icon} className="h-4 w-4" />
                    </span>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border/60 bg-muted/40 px-6 py-5">
          <ProfileMenu placement="top" onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
