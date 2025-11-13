import { Fragment, ReactNode } from "react"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface DashboardPageShellProps {
  children: ReactNode
  className?: string
}

export function DashboardPageShell({ children, className }: DashboardPageShellProps) {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>
}

export type DashboardBreadcrumb = {
  label: ReactNode
  href?: string
}

interface DashboardPageHeaderProps {
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  align?: "start" | "between"
  breadcrumbs?: DashboardBreadcrumb[]
  className?: string
}

export function DashboardPageHeader({
  title,
  description,
  meta,
  actions,
  align = "start",
  breadcrumbs,
  className,
}: DashboardPageHeaderProps) {
  const hasActions = Boolean(actions)
  const layoutClass = align === "between" && hasActions ? "lg:flex-row lg:items-start lg:justify-between" : undefined

  return (
    <Card className={cn("border-border/70 bg-card/90 shadow-sm", className)}>
      <CardHeader className="space-y-4">
        {breadcrumbs?.length ? <DashboardBreadcrumbs items={breadcrumbs} /> : null}
        <div className={cn("flex flex-col gap-4", layoutClass)}>
          <div className="space-y-3">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">{title}</CardTitle>
              {description ? (
                <CardDescription className="text-sm text-muted-foreground">{description}</CardDescription>
              ) : null}
            </div>
            {meta ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{meta}</div>
            ) : null}
          </div>
          {hasActions ? (
            <>
              <Separator className="-mx-2 opacity-20 lg:hidden" />
              <div className="flex flex-wrap gap-2">{actions}</div>
            </>
          ) : null}
        </div>
      </CardHeader>
    </Card>
  )
}

function DashboardBreadcrumbs({ items }: { items: DashboardBreadcrumb[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const key = typeof item.label === "string" ? `${item.label}-${index}` : index
          return (
            <Fragment key={key}>
              <BreadcrumbItem>
                {item.href && !isLast ? (
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
