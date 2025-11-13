"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Task } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"

const typeLabels: Record<Task["type"], string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  maintenance: "Maintenance",
}

type FilterValue = "all" | Task["type"]

const filterOptions: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "delivery", label: typeLabels.delivery },
  { value: "pickup", label: typeLabels.pickup },
  { value: "maintenance", label: typeLabels.maintenance },
]

const priorityTone: Record<Task["priority"], string> = {
  High: "border-rose-200 text-rose-50",
  Medium: "border-amber-200 text-amber-50",
  Low: "border-emerald-200 text-emerald-50",
}

const statusTone: Record<Task["status"], string> = {
  todo: "border-white/30 text-white/70",
  inprogress: "border-sky-200 text-sky-50",
  done: "border-emerald-200 text-emerald-50",
}

const statusLabels: Record<Task["status"], string> = {
  todo: "Queued",
  inprogress: "In progress",
  done: "Completed",
}

export function DriverTaskList({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<FilterValue>("all")
  const filtered = useMemo(() => {
    return tasks.filter((task) => (filter === "all" ? true : task.type === filter))
  }, [filter, tasks])

  const handleFilterChange = (value: string) => {
    setFilter((value as FilterValue) || "all")
  }

  return (
    <div className="space-y-4">
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={handleFilterChange}
        className="flex flex-wrap gap-2"
        aria-label="Filter tasks by type"
      >
        {filterOptions.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            variant="outline"
            className={cn(
              "rounded-full border px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/70 transition",
              "data-[state=on]:border-white data-[state=on]:bg-white/10 data-[state=on]:text-white"
            )}
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="space-y-4">
        {filtered.map((task) => (
          <Link key={task.id} href={toRoute(`/driver/tasks/${task.id}`)} className="block" prefetch={false}>
            <Card className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent text-white shadow-lg transition hover:border-white/40">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                  <span>{typeLabels[task.type]}</span>
                  <span>ETA {task.deadline}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-xl text-white">{task.title}</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn("border border-white/25 bg-white/5 text-[0.65rem] uppercase tracking-[0.25em]", priorityTone[task.priority])}
                  >
                    {task.priority} priority
                  </Badge>
                </div>
                <CardDescription className="text-sm text-white/80">
                  {task.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3 text-xs text-white/70">
                <Badge variant="outline" className="border-white/25 bg-white/5 text-white/80">
                  #{task.bookingCode ?? task.bookingId ?? "—"}
                </Badge>
                <Badge variant="outline" className={cn("border-white/25 bg-white/5 text-white/80", statusTone[task.status])}>
                  {statusLabels[task.status]}
                </Badge>
                <span>SLA {task.slaMinutes} min</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

function toRoute(path: string) {
  return path as Parameters<typeof Link>[0]["href"]
}
