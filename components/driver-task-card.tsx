"use client"

import Link from "next/link"
import { useEffect, useState, type PropsWithChildren } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Task } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"
import { ArrowDownToLine, CheckCircle2, Hourglass, Loader2, MapPin, User } from "lucide-react"
import { formatDateTime } from "@/lib/formatters"

export const taskTypeLabels: Record<Task["type"], string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  maintenance: "Maintenance",
}

export const taskStatusColors: Record<Task["status"], string> = {
  todo: "text-muted-foreground",
  inprogress: "text-blue-500",
  done: "text-green-500",
}

export const taskStatusLabels: Record<Task["status"], string> = {
  todo: "Queued",
  inprogress: "In progress",
  done: "Completed",
}

export function TaskStatusBadge({ status, className }: { status: Task["status"]; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center text-xs font-medium tracking-wide uppercase",
        taskStatusColors[status],
        className
      )}
    >
      <span className="mr-1.5 inline-flex h-2 w-2 items-center justify-center">
        {status === "todo" ? (
          <Hourglass className="h-3 w-3" />
        ) : status === "inprogress" ? (
          <ArrowDownToLine className="h-3 w-3" />
        ) : (
          <CheckCircle2 className="h-3 w-3" />
        )}
      </span>
      {taskStatusLabels[status]}
    </div>
  )
}

type DriverTaskCardProps = PropsWithChildren<{
  task: Task
  href?: Parameters<typeof Link>[0]["href"]
  clickable?: boolean
  showEta?: boolean
  showStatus?: boolean
  showLocationHeader?: boolean
  showClient?: boolean
  mapUrl?: string
}>

export function DriverTaskCard({
  task,
  href,
  clickable = Boolean(href),
  showEta = true,
  showStatus = true,
  showLocationHeader = true,
  showClient = true,
  mapUrl,
  children,
}: DriverTaskCardProps) {
  const router = useRouter()
  const [opening, setOpening] = useState(false)
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true)
  useEffect(() => {
    function onOnline() { setIsOnline(true) }
    function onOffline() { setIsOnline(false) }
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
  const card = (
    <Card className="group relative overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/20">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className="rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          >
            {taskTypeLabels[task.type]}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            {formatDateTime(task.deadline, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Badge
            variant="outline"
            className="w-fit rounded-md border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-foreground"
          >
            {task.vehiclePlate ?? "N/A"}
          </Badge>
          <CardTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {task.vehicleName ?? task.title}
          </CardTitle>
        </div>
        {task.driverName ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-4 w-4 shrink-0 text-muted-foreground/70" />
            <span className="font-medium text-foreground">{task.driverName}</span>
          </div>
        ) : null}
        {showLocationHeader
          ? (() => {
              if (!task.geo) return null
              let text = ""
              if (task.type === "delivery") {
                text = task.geo.dropoff ?? ""
              } else if (task.type === "pickup") {
                text = task.geo.pickup ?? ""
              } else {
                text =
                  task.geo.pickup && task.geo.dropoff
                    ? `${task.geo.pickup} → ${task.geo.dropoff}`
                    : task.geo.pickup || task.geo.dropoff || ""
              }
              return text ? (
                <CardDescription className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                  {!clickable && mapUrl ? (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline"
                    >
                      {text}
                    </a>
                  ) : (
                    <span>{text}</span>
                  )}
                </CardDescription>
              ) : null
            })()
          : null}
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">
        {children ? <div className="w-full">{children}</div> : null}
      </CardContent>
    </Card>
  )

  if (clickable && href) {
    return (
      <div className="relative">
        <button
          type="button"
          className="block w-full text-left transition-transform active:scale-[0.98]"
          onClick={() => {
            if (opening) return
            setOpening(true)
            router.push(href as Route)
          }}
          aria-busy={opening}
          disabled={opening}
        >
          {card}
        </button>
        {opening ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>{isOnline ? "Opening task…" : "No internet connection!"}</span>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return <div className="block">{card}</div>
}
