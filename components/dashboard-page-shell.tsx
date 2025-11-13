import { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface DashboardPageShellProps {
  children: ReactNode
  className?: string
}

export function DashboardPageShell({ children, className }: DashboardPageShellProps) {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>
}

interface DashboardPageHeaderProps {
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  align?: "start" | "between"
  className?: string
}

export function DashboardPageHeader({
  title,
  description,
  meta,
  actions,
  align = "start",
  className,
}: DashboardPageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      <div
        className={cn(
          "flex flex-wrap gap-3",
          align === "between" ? "items-start justify-between" : "items-baseline"
        )}
      >
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {meta ? <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{meta}</div> : null}
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}
