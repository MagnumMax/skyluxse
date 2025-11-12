"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type { Task } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"

const typeLabels: Record<Task["type"], string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  maintenance: "Maintenance",
}

export function DriverTaskList({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<"all" | Task["type"]>("all")
  const filtered = useMemo(() => {
    return tasks.filter((task) => (filter === "all" ? true : task.type === filter))
  }, [filter, tasks])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["all", "delivery", "pickup", "maintenance"] as const).map((item) => (
          <button
            key={item}
            className={cn(
              "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]",
              filter === item
                ? "border-white bg-white/10 text-white"
                : "border-white/20 text-white/60"
            )}
            onClick={() => setFilter(item as any)}
            type="button"
          >
            {item === "all" ? "All" : typeLabels[item as Task["type"]]}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {filtered.map((task) => (
          <Link
            key={task.id}
            href={toRoute(`/driver/tasks/${task.id}`)}
            className="block rounded-3xl border border-white/15 bg-white/5 p-4 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">{typeLabels[task.type]}</p>
                <p className="text-lg font-semibold text-white">{task.title}</p>
              </div>
              <span className="text-xs font-semibold text-rose-200">ETA {task.deadline}</span>
            </div>
            <p className="mt-2 text-sm text-white/80">{task.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function toRoute(path: string) {
  return path as Parameters<typeof Link>[0]["href"]
}
