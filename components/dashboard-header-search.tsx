"use client"

import type { ReactNode } from "react"
import { Search, X } from "lucide-react"

import { DashboardHeaderSlot } from "@/components/dashboard-header-context"
import { cn } from "@/lib/utils"

type DashboardHeaderSearchProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  actions?: ReactNode
  className?: string
}

export function DashboardHeaderSearch({
  value,
  onChange,
  placeholder = "Search…",
  actions,
  className,
}: DashboardHeaderSearchProps) {
  return (
    <DashboardHeaderSlot>
      <div className={cn("flex w-full flex-wrap items-center gap-2 md:gap-3", className)}>
        <HeaderSearchInput value={value} onChange={onChange} placeholder={placeholder} />
        {actions}
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
    <div className="relative min-w-[180px] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-full border border-white/15 bg-slate-900/80 pl-10 pr-9 text-[13px] text-slate-50 placeholder:text-slate-400 shadow-inner transition focus:border-primary focus:outline-none focus:ring-0"
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
