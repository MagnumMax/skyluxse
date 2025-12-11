"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"

import { DriverTaskList } from "@/components/driver-task-list"
import type { Task } from "@/lib/domain/entities"

type FilterValue = "all" | Task["type"]
type StatusFilter = "all" | "todo" | "inprogress" | "done"

export function DriverTasksView({ tasks }: { tasks: Task[] }) {
  const searchParams = useSearchParams()
  const filterParam = searchParams.get("type") as FilterValue | null
  const filter: FilterValue = filterParam && ["delivery", "pickup", "maintenance"].includes(filterParam)
    ? (filterParam as FilterValue)
    : "all"
  const statusParam = searchParams.get("status") as StatusFilter | null
  const statusFilter: StatusFilter = statusParam && ["todo", "inprogress", "done", "all"].includes(statusParam)
    ? (statusParam as StatusFilter)
    : "todo"
  const query = (searchParams.get("q") ?? "").trim().toLowerCase()

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const typeMatch = filter === "all" ? true : task.type === filter
      const statusMatch = statusFilter === "all" ? true : task.status === statusFilter
      const queryMatch = query
        ? [
            task.title,
            task.vehicleName,
            task.vehiclePlate,
            task.bookingCode,
            task.geo?.pickup,
            task.geo?.dropoff,
          ].some((value) => (value ?? "").toLowerCase().includes(query))
        : true
      return typeMatch && statusMatch && queryMatch
    })
  }, [filter, statusFilter, query, tasks])

  return <DriverTaskList tasks={filtered} />
}
