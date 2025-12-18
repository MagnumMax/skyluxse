"use client"

import Link from "next/link"

import { DriverTaskCard, TaskStatusBadge } from "@/components/driver-task-card"
import type { Task } from "@/lib/domain/entities"
import { Badge } from "@/components/ui/badge"
import { User, ExternalLink } from "lucide-react"

export function DriverTaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="space-y-6">
      {tasks.map((task) => (
        <DriverTaskCard 
          key={task.id} 
          task={task} 
          href={toRoute(`/driver/tasks/${task.id}`)}
          showClient={false}
        >
          <div className="flex flex-col gap-3">
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="tracking-wider">#{task.bookingCode ?? task.bookingId}</span>
                {task.zohoSalesOrderUrl ? (
                  <a
                    href={task.zohoSalesOrderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground hover:underline transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Sales order</span>
                  </a>
                ) : null}
              </div>
              <TaskStatusBadge status={task.status} className="text-[10px] sm:text-xs" />
            </div>
          </div>
        </DriverTaskCard>
      ))}
    </div>
  )
}

function toRoute(path: string) {
  return path as Parameters<typeof Link>[0]["href"]
}
