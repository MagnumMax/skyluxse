"use client"

import { type ReactNode, useMemo } from "react"
import { ArrowDownToLine, Car, CheckCircle2, Hourglass, Package, Wrench } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type FilterValue = "all" | "delivery" | "pickup" | "maintenance"
type StatusFilter = "all" | "todo" | "inprogress" | "done"

const filterOptions: { value: FilterValue; label: string; icon: ReactNode }[] = [
  { value: "all", label: "All", icon: <Car className="h-3.5 w-3.5" /> },
  { value: "delivery", label: "Delivery", icon: <Package className="h-3.5 w-3.5" /> },
  { value: "pickup", label: "Pickup", icon: <ArrowDownToLine className="h-3.5 w-3.5" /> },
  { value: "maintenance", label: "Maintenance", icon: <Wrench className="h-3.5 w-3.5" /> },
]

const statusOptions: { value: StatusFilter; label: string; icon: ReactNode }[] = [
  { value: "todo", label: "Queued", icon: <Hourglass className="h-3.5 w-3.5" /> },
  { value: "inprogress", label: "In progress", icon: <ArrowDownToLine className="h-3.5 w-3.5" /> },
  { value: "done", label: "Completed", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
]

export function DriverHeaderBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const isTasksPage = useMemo(() => pathname === "/driver/tasks", [pathname])

  const currentFilter = useMemo<FilterValue>(() => {
    const value = searchParams.get("type")
    if (value === "delivery" || value === "pickup" || value === "maintenance") return value
    return "all"
  }, [searchParams])

  const currentStatus = useMemo<StatusFilter>(() => {
    const value = searchParams.get("status")
    if (value === "todo" || value === "inprogress" || value === "done") return value
    return "todo"
  }, [searchParams])

  const setFilter = (value: FilterValue) => {
    if (!pathname) return
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("type")
    } else {
      params.set("type", value)
    }
    const query = params.toString()
    router.replace((query ? `${pathname}?${query}` : pathname) as any, { scroll: false })
  }

  const setStatus = (value: StatusFilter) => {
    if (!pathname) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("status", value)
    const query = params.toString()
    router.replace((query ? `${pathname}?${query}` : pathname) as any, { scroll: false })
  }

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-linear-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.5em] text-slate-400">Driver</p>
          <h1 className="text-xl font-semibold tracking-tight text-white">SkyLuxse</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isTasksPage ? (
            <TooltipProvider delayDuration={100}>
              <div
                className="flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2 py-1"
                aria-label="Filters"
              >
                <ToggleGroup
                  type="single"
                  value={currentFilter}
                  onValueChange={(value) => setFilter((value as FilterValue) || "all")}
                  className="rounded-full bg-white/5 p-0.5"
                  aria-label="Task type"
                >
                  {filterOptions.map((option) => (
                    <Tooltip key={option.value}>
                      <TooltipTrigger asChild>
                        <ToggleGroupItem
                          value={option.value}
                          size="sm"
                          className="rounded-full border border-white/30 text-white hover:bg-white/10 data-[state=on]:border-emerald-400 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-100"
                        >
                          {option.icon}
                          <span className="sr-only">{option.label}</span>
                        </ToggleGroupItem>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-xs text-white" sideOffset={4}>
                        {option.label}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </ToggleGroup>
                <ToggleGroup
                  type="single"
                  value={currentStatus}
                  onValueChange={(value) => setStatus((value as StatusFilter) || "todo")}
                  className="rounded-full bg-white/5 p-0.5"
                  aria-label="Task status"
                >
                  {statusOptions.map((option) => (
                    <Tooltip key={option.value}>
                      <TooltipTrigger asChild>
                        <ToggleGroupItem
                          value={option.value}
                          size="sm"
                          className="rounded-full border border-white/30 text-white hover:bg-white/10 data-[state=on]:border-sky-300 data-[state=on]:bg-sky-500/20 data-[state=on]:text-sky-50"
                        >
                          {option.icon}
                          <span className="sr-only">{option.label}</span>
                        </ToggleGroupItem>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-xs text-white" sideOffset={4}>
                        {option.label}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </ToggleGroup>
              </div>
            </TooltipProvider>
          ) : null}
          <button className="flex items-center gap-2 rounded-full border border-white/40 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/80">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Online
          </button>
        </div>
      </div>
    </header>
  )
}
