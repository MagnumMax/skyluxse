"use client"

import Link from "next/link"
import type { PropsWithChildren } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Task } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"
import { ArrowDownToLine, CheckCircle2, Hourglass } from "lucide-react"

export const taskTypeLabels: Record<Task["type"], string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  maintenance: "Maintenance",
}

export const taskStatusTone: Record<Task["status"], string> = {
  todo: "border-white/30 text-white/70",
  inprogress: "border-sky-200 text-sky-50",
  done: "border-emerald-200 text-emerald-50",
}

export const taskStatusLabels: Record<Task["status"], string> = {
  todo: "Queued",
  inprogress: "In progress",
  done: "Completed",
}

type DriverTaskCardProps = PropsWithChildren<{
  task: Task
  href?: Parameters<typeof Link>[0]["href"]
  clickable?: boolean
  showEta?: boolean
  showStatus?: boolean
}>

export function DriverTaskCard({
  task,
  href,
  clickable = Boolean(href),
  showEta = true,
  showStatus = true,
  children,
}: DriverTaskCardProps) {
  const card = (
    <Card className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent text-white shadow-lg transition hover:border-white/40">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
          <span>{taskTypeLabels[task.type]}</span>
          {showEta ? <span>ETA {task.deadline}</span> : <span aria-hidden className="invisible">ETA hidden</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className="border border-white/70 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-900 shadow-sm"
          >
            {task.vehiclePlate ?? task.bookingCode ?? "N/A"}
          </Badge>
          <CardTitle className="text-xl text-white">{task.vehicleName ?? task.title}</CardTitle>
        </div>
        {task.geo ? (
          <CardDescription className="text-sm text-white/80">
            {task.geo.pickup && task.geo.dropoff
              ? `${task.geo.pickup} → ${task.geo.dropoff}`
              : task.geo.pickup || task.geo.dropoff || ""}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3 text-xs text-white/70">
        <Badge variant="outline" className="border-white/25 bg-white/5 text-white/80">
          #{task.bookingCode ?? task.bookingId ?? "—"}
        </Badge>
        {showStatus ? (
          <Badge variant="outline" className={cn("border-white/25 bg-white/5 text-white/80", taskStatusTone[task.status])}>
            <span className="mr-1.5 inline-flex h-3.5 w-3.5 items-center justify-center">
              {task.status === "todo" ? (
                <Hourglass className="h-3 w-3" />
              ) : task.status === "inprogress" ? (
                <ArrowDownToLine className="h-3 w-3" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
            </span>
            {taskStatusLabels[task.status]}
          </Badge>
        ) : null}
        {children ? <div className="w-full pt-1 text-white">{children}</div> : null}
      </CardContent>
    </Card>
  )

  if (clickable && href) {
    return (
      <Link href={href} className="block" prefetch={false}>
        {card}
      </Link>
    )
  }

  return <div className="block">{card}</div>
}
