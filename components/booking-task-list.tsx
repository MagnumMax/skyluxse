"use client"

import Link from "next/link"

import { OperationsTaskCard } from "@/components/operations-task-card"
import type { OperationsTask } from "@/lib/domain/entities"

export function BookingTaskList({ tasks }: { tasks: OperationsTask[] }) {
  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
        <p>No tasks linked to this booking</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <Link key={task.id} href={`/tasks/${task.id}`} className="block transition-transform hover:scale-[1.01]">
          <OperationsTaskCard task={task} className="h-full bg-card hover:border-primary/50" />
        </Link>
      ))}
    </div>
  )
}
