"use client"

import { useMemo, useState } from "react"

import type { OperationsTask } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const typeFilters = ["all", "delivery", "pickup", "maintenance"] as const
const statusColumns = [
  {
    id: "todo" as const,
    label: "Backlog",
    description: "Queued items awaiting checklist inputs",
  },
  {
    id: "inprogress" as const,
    label: "In progress",
    description: "Live ops with ticking SLA",
  },
  {
    id: "done" as const,
    label: "Completed",
    description: "Resolved and logged",
  },
]

export function OperationsTasksBoard({ tasks }: { tasks: OperationsTask[] }) {
  const [typeFilter, setTypeFilter] = useState<(typeof typeFilters)[number]>("all")
  const [ownerFilter, setOwnerFilter] = useState<string>("all")

  const ownerOptions = useMemo(() => {
    const unique = Array.from(new Set(tasks.map((task) => task.owner)))
    return ["all", ...unique]
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesType = typeFilter === "all" ? true : task.type === typeFilter
      const matchesOwner = ownerFilter === "all" ? true : task.owner === ownerFilter
      return matchesType && matchesOwner
    })
  }, [tasks, typeFilter, ownerFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {typeFilters.map((filter) => (
          <button
            key={filter}
            className={cn(
              "rounded-full border border-border/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em]",
              typeFilter === filter ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
            )}
            onClick={() => setTypeFilter(filter)}
          >
            {filter === "all" ? "All" : filter}
          </button>
        ))}
        <Select value={ownerFilter} onValueChange={(value) => setOwnerFilter(value)}>
          <SelectTrigger className="w-48 rounded-full border-border/70 text-xs font-semibold uppercase tracking-[0.35em]">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            {ownerOptions.map((owner) => (
              <SelectItem key={owner} value={owner} className="text-sm">
                {owner === "all" ? "All owners" : owner}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="rounded-full">Refresh board</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statusColumns.map((column) => {
          const columnTasks = filteredTasks.filter((task) => task.status === column.id)
          return (
            <div key={column.id} className="rounded-[28px] border border-border/70 bg-background/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">{column.label}</p>
                  <p className="text-sm text-muted-foreground">{column.description}</p>
                </div>
                <span className="text-sm font-semibold text-muted-foreground">{columnTasks.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {columnTasks.length === 0 ? (
                  <p className="rounded-3xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">No tasks in this state.</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: OperationsTask }) {
  const completionPct = Math.round((task.requiredInputs.completed / task.requiredInputs.total) * 100)
  return (
    <div className="space-y-3 rounded-3xl border border-border/60 bg-card/80 p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-[0.35em] text-muted-foreground">{task.category}</span>
        <span className="rounded-full border border-border/60 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
          {task.priority}
        </span>
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{task.title}</p>
        <p className="text-sm text-muted-foreground">{task.description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
        {task.bookingId ? (
          <span className="rounded-full border border-border/60 px-2 py-0.5">
            Booking #{task.bookingCode ?? task.bookingId}
          </span>
        ) : null}
        <span className="rounded-full border border-border/60 px-2 py-0.5">SLA {task.slaMinutes}m</span>
        <span className="rounded-full border border-border/60 px-2 py-0.5">{task.channel}</span>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Required inputs</p>
        <div className="mt-2 h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${completionPct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {task.requiredInputs.completed}/{task.requiredInputs.total} complete
        </p>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          <p className="font-semibold text-foreground">{task.owner}</p>
          <p className="text-[11px] uppercase tracking-[0.35em]">{task.ownerRole}</p>
        </div>
        <span>{formatTime(task.lastUpdate)}</span>
      </div>
    </div>
  )
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value))
  } catch {
    return value
  }
}
