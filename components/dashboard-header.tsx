"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"

import { Icon, type NavIcon } from "@/components/icons"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
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

  return (
    <header
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-background/95 px-4 py-3 lg:px-10",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <MobileNav navGroups={navGroups} />
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{currentMeta.title}</h1>
        </div>
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
