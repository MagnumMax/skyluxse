"use client"

import { useMemo, useState } from "react"

import { DashboardHeaderSearch } from "@/components/dashboard-header-search"
import type { OperationsTask } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { OperationsTaskCard } from "@/components/operations-task-card"
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
    description: "Queued items awaiting required inputs",
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
  const [search, setSearch] = useState("")

  const ownerOptions = useMemo(() => {
    const unique = Array.from(new Set(tasks.map((task) => task.owner)))
    return ["all", ...unique]
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesType = typeFilter === "all" ? true : task.type === typeFilter
      const matchesOwner = ownerFilter === "all" ? true : task.owner === ownerFilter
      if (!matchesType || !matchesOwner) return false
      if (search.trim().length === 0) return true
      const haystack = [
        task.title,
        task.description,
        task.owner,
        task.channel,
        task.bookingCode ?? task.bookingId,
        task.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(search.toLowerCase())
    })
  }, [ownerFilter, search, tasks, typeFilter])

  return (
    <div className="space-y-6">
      <DashboardHeaderSearch
        value={search}
        onChange={setSearch}
        placeholder="Search tasks, owner, booking…"
      />
      <div className="flex flex-wrap items-center gap-3">
        {typeFilters.map((filter) => (
          <Button
            key={filter}
            variant={typeFilter === filter ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-auto rounded-full px-4 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.35em]",
              typeFilter === filter
                ? "bg-primary text-primary-foreground"
                : "border-border/70 bg-background text-muted-foreground"
            )}
            onClick={() => setTypeFilter(filter)}
          >
            {filter === "all" ? "All" : filter}
          </Button>
        ))}
        <Select value={ownerFilter} onValueChange={(value) => setOwnerFilter(value)}>
          <SelectTrigger className="w-48 rounded-full border-border/70 text-[0.6rem] font-semibold uppercase tracking-[0.35em]">
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
        <Button
          variant="ghost"
          size="sm"
          className="h-auto rounded-full px-4 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.35em]"
        >
          Refresh board
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statusColumns.map((column) => {
          const columnTasks = filteredTasks.filter((task) => task.status === column.id)
          return (
            <div
              key={column.id}
              className="rounded-[28px] border border-border/70 bg-background/90 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                    {column.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{column.description}</p>
                </div>
                <span className="text-sm font-semibold text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {columnTasks.map((task) => (
                  <OperationsTaskCard key={task.id} task={task} />
                ))}
                {columnTasks.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
                    No tasks in this state.
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
