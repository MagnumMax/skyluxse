"use client"

import Link from "next/link"

import { DriverTaskCard } from "@/components/driver-task-card"
import type { Task } from "@/lib/domain/entities"

export function DriverTaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="space-y-5">
      {tasks.map((task) => (
        <DriverTaskCard key={task.id} task={task} href={toRoute(`/driver/tasks/${task.id}`)} />
      ))}
    </div>
  )
}

function toRoute(path: string) {
  return path as Parameters<typeof Link>[0]["href"]
}
