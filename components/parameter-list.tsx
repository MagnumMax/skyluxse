import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type ParameterListItem = {
  label: string
  value?: ReactNode
  helper?: ReactNode
  valueToneClassName?: string
  helperToneClassName?: string
}

type ParameterListProps = {
  items: ParameterListItem[]
  columns?: 1 | 2 | 3 | 4
  valueSize?: "base" | "lg" | "xl"
}

export function ParameterList({ items, columns = 2, valueSize = "base" }: ParameterListProps) {
  const columnClass = resolveColumnClass(columns)
  const valueClass = valueSizeClass(valueSize)

  return (
    <dl className={cn("grid gap-x-6 gap-y-4", columnClass)}>
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="space-y-1">
          <dt className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">{item.label}</dt>
          <dd className={cn(valueClass, "text-foreground", item.valueToneClassName)}>{item.value ?? "—"}</dd>
          {item.helper ? (
            <div className={cn("text-xs text-muted-foreground", item.helperToneClassName)}>{item.helper}</div>
          ) : null}
        </div>
      ))}
    </dl>
  )
}

function resolveColumnClass(columns: ParameterListProps["columns"]) {
  switch (columns) {
    case 1:
      return "grid-cols-1"
    case 2:
      return "grid-cols-1 sm:grid-cols-2"
    case 3:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    case 4:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    default:
      return "grid-cols-1"
  }
}

function valueSizeClass(size: ParameterListProps["valueSize"]) {
  if (size === "lg") return "text-lg font-semibold"
  if (size === "xl") return "text-2xl font-semibold"
  return "text-base font-semibold"
}
