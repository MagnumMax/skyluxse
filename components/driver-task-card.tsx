"use client"

import Link from "next/link"
import { useEffect, useState, type PropsWithChildren } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Task } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"
import { ArrowDownToLine, CheckCircle2, Hourglass, Loader2, User, MapPin } from "lucide-react"
import { formatDateTime } from "@/lib/formatters"

export const taskTypeLabels: Record<Task["type"], string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  maintenance: "Maintenance",
}

export const taskStatusColors: Record<Task["status"], string> = {
  todo: "text-red-400",
  inprogress: "text-yellow-400",
  done: "text-green-400",
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
        "flex items-center text-sm font-semibold tracking-[0.18em] sm:tracking-[0.3em]",
        taskStatusColors[status],
        className
      )}
    >
      <span className="mr-1.5 inline-flex h-3 w-3 items-center justify-center">
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
    <Card className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent text-white shadow-lg transition hover:border-white/40">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm tracking-[0.18em] text-white/70 sm:text-xs sm:uppercase sm:tracking-[0.3em] sm:text-white/60">
          <span>{taskTypeLabels[task.type]}</span>
          <Badge
            variant="outline"
            className="border-white/30 bg-white/10 px-3 py-1.5 text-sm font-semibold tracking-[0.18em] text-white sm:tracking-[0.3em]"
          >
            <span>
              {formatDateTime(task.deadline, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </span>
          </Badge>
        </div>
        <div className="flex flex-col gap-1">
          <Badge
            variant="outline"
            className="w-fit border border-white/70 bg-white px-2.5 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-slate-900 shadow-sm sm:px-3.5 sm:py-2 sm:text-base sm:tracking-[0.22em]"
          >
            {task.vehiclePlate ?? "N/A"}
          </Badge>
          <CardTitle className="text-xl text-white sm:text-3xl">{task.vehicleName ?? task.title}</CardTitle>
        </div>
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
                <CardDescription className="line-clamp-2 text-sm text-white/80 sm:line-clamp-none sm:whitespace-normal sm:overflow-visible">
                  {!clickable && mapUrl ? (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline hover:text-white"
                    >
                      <MapPin className="h-4 w-4" />
                      {text}
                    </a>
                  ) : (
                    text
                  )}
                </CardDescription>
              ) : null
            })()
          : null}
      </CardHeader>
      <CardContent className="pt-0 text-sm text-white/75">
        {children ? <div className="w-full text-white">{children}</div> : null}
      </CardContent>
    </Card>
  )

  if (clickable && href) {
    return (
      <div className="relative">
        <button
          type="button"
          className="block w-full text-left"
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
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-lg font-semibold tracking-[0.18em] text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isOnline ? "Opening task…" : "No internet connection!"}</span>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return <div className="block">{card}</div>
}
