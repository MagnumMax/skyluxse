"use client"

import { type ReactNode, useMemo, useEffect, useState } from "react"
import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Filter,
  Hourglass,
  Layers,
  Loader2,
  Package,
  Search,
  Wrench,
} from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { Route } from "next"

import { DashboardHeaderSlot } from "@/components/dashboard-header-context"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type FilterValue = "all" | "delivery" | "pickup" | "maintenance"
type StatusFilter = "all" | "todo" | "inprogress" | "done"

const filterOptions: { value: FilterValue; label: string; icon: ReactNode }[] = [
  { value: "all", label: "All types", icon: <Filter className="h-4 w-4" /> },
  { value: "delivery", label: "Delivery", icon: <Package className="h-4 w-4" /> },
  { value: "pickup", label: "Pickup", icon: <ArrowDownToLine className="h-4 w-4" /> },
  { value: "maintenance", label: "Maintenance", icon: <Wrench className="h-4 w-4" /> },
]

const statusOptions: { value: StatusFilter; label: string; icon: ReactNode }[] = [
  { value: "all", label: "Any status", icon: <Layers className="h-4 w-4" /> },
  { value: "todo", label: "Queued", icon: <Hourglass className="h-4 w-4" /> },
  { value: "inprogress", label: "In progress", icon: <Loader2 className="h-4 w-4" /> },
  { value: "done", label: "Completed", icon: <CheckCircle2 className="h-4 w-4" /> },
]

export function DriverHeaderActions() {
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  const router = useRouter()

  const isDriverRoute = useMemo(() => pathname.startsWith("/driver"), [pathname])
  const currentFilter = useMemo<FilterValue>(() => {
    const value = searchParams.get("type")
    if (value === "delivery" || value === "pickup" || value === "maintenance") return value
    return "all"
  }, [searchParams])
  const currentStatus = useMemo<StatusFilter>(() => {
    const value = searchParams.get("status")
    if (value === "todo" || value === "inprogress" || value === "done" || value === "all") return value
    return "todo"
  }, [searchParams])
  const currentQuery = useMemo(() => searchParams.get("q") ?? "", [searchParams])

  const updateParams = (updates: Record<string, string | null>) => {
    if (!pathname) return
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    const query = params.toString()
    router.replace((query ? `${pathname}?${query}` : pathname) as Route, { scroll: false })
  }

  const setFilter = (value: FilterValue) => {
    updateParams({ type: value === "all" ? null : value })
  }

  const setStatus = (value: StatusFilter) => {
    updateParams({ status: value })
  }

  const setQuery = (value: string) => {
    const trimmed = value.trim()
    updateParams({ q: trimmed.length ? trimmed : null })
  }

  if (!isDriverRoute) {
    return null
  }

  return (
    <DashboardHeaderSlot>
      <div className="flex w-full min-w-0 flex-nowrap items-center gap-1 overflow-x-auto md:flex-wrap md:gap-3">
        {pathname.startsWith("/driver/tasks") ? (
          <>
            <HeaderSearchInput value={currentQuery} onChange={setQuery} placeholder="Search tasks…" />
            <div className="flex items-center gap-2">
              <FilterDropdown
                label="Filter by type"
                icon={filterOptions.find((o) => o.value === currentFilter)?.icon ?? <Filter className="h-4 w-4" />}
                options={filterOptions}
                value={currentFilter}
                onChange={(v) => setFilter(v)}
              />
              <FilterDropdown
                label="Filter by status"
                icon={statusOptions.find((o) => o.value === currentStatus)?.icon ?? <Layers className="h-4 w-4" />}
                options={statusOptions}
                value={currentStatus}
                onChange={(v) => setStatus(v)}
              />
            </div>
          </>
        ) : null}
        <OnlinePill />
      </div>
    </DashboardHeaderSlot>
  )
}

function HeaderSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative min-w-[140px] flex-1 md:min-w-[260px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-9 w-full rounded-full border border-white/15 bg-slate-900/80 pl-10 pr-3 text-[13px] text-slate-50 placeholder:text-slate-400 shadow-inner transition",
          "focus:border-primary focus:outline-none focus:ring-0"
        )}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}

function OnlinePill() {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true)
  useEffect(() => {
    function onOnline() {
      setIsOnline(true)
    }
    function onOffline() {
      setIsOnline(false)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline)
      window.addEventListener("offline", onOffline)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline)
        window.removeEventListener("offline", onOffline)
      }
    }
  }, [])
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/25 bg-white/5 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/80">
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${isOnline ? "bg-emerald-400" : "bg-rose-400"} opacity-60`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-rose-400"}`} />
      </span>
      {isOnline ? "On" : "Off"}
    </div>
  )
}

type FilterDropdownOption<T extends string> = { value: T; label: string; icon: ReactNode }

function FilterDropdown<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
}: {
  label: string
  icon: ReactNode
  options: FilterDropdownOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/5 text-white shadow-sm transition hover:border-white/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {icon}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-48 rounded-2xl border border-white/15 bg-slate-900/95 p-1 text-white shadow-xl backdrop-blur">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm focus:bg-white/10"
            onSelect={(event) => {
              event.preventDefault()
              onChange(option.value)
            }}
          >
            <span className="flex h-5 w-5 items-center justify-center text-white">{option.icon}</span>
            <span className="flex-1">{option.label}</span>
            {value === option.value ? <Check className="h-4 w-4 text-emerald-400" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
