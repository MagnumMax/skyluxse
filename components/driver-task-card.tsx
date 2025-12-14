"use client"

import Link from "next/link"
import { useEffect, useState, type PropsWithChildren } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Task } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"
import { ArrowDownToLine, CheckCircle2, Hourglass, Loader2, User } from "lucide-react"
import { formatDateTime } from "@/lib/formatters"

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
  showLocationHeader?: boolean
}>

export function DriverTaskCard({
  task,
  href,
  clickable = Boolean(href),
  showEta = true,
  showStatus = true,
  showLocationHeader = true,
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
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs tracking-[0.18em] text-white/70 sm:text-xs sm:uppercase sm:tracking-[0.3em] sm:text-white/60">
          <div className="flex flex-wrap items-center gap-2">
            <span>{taskTypeLabels[task.type]}</span>
            <Badge
              variant="outline"
              className="border-white/30 bg-white/10 px-2.5 py-1 text-xs font-semibold tracking-[0.18em] text-white sm:tracking-[0.3em]"
            >
              <span className="sm:hidden">
                {formatDateTime(task.deadline, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="hidden sm:inline">
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
          <div className="flex items-center gap-2">
            {showStatus ? (
              <Badge
                variant="outline"
                className={cn(
                  "border-white/25 bg-white/5 px-2.5 py-1 text-xs font-semibold tracking-[0.18em] text-white/85 sm:tracking-[0.3em]",
                  taskStatusTone[task.status]
                )}
              >
                <span className="mr-1.5 inline-flex h-3 w-3 items-center justify-center">
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
            ) : showEta ? (
              <span>ETA {task.deadline}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className="border border-white/70 bg-white px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.22em] text-slate-900 shadow-sm"
          >
            {task.vehiclePlate ?? "N/A"}
          </Badge>
          <CardTitle className="text-xl text-white sm:text-2xl">{task.vehicleName ?? task.title}</CardTitle>
        </div>
        {task.clientName ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-white/90">
            <User className="h-4 w-4 text-white/70" />
            <span>{task.clientName}</span>
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
                <CardDescription className="truncate text-base text-white/80 sm:text-sm sm:whitespace-normal sm:overflow-visible">
                  {text}
                </CardDescription>
              ) : null
            })()
          : null}
      </CardHeader>
      <CardContent className="text-sm text-white/75">
        {children ? <div className="w-full pt-1 text-white">{children}</div> : null}
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
            <div className="flex items-center gap-3 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-base font-semibold tracking-[0.18em] text-white">
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
