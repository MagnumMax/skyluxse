"use client"

import Link from "next/link"

import { DriverTaskCard } from "@/components/driver-task-card"
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
            {task.clientName ? (
              <div className="flex items-center gap-1.5 text-base font-medium text-white/90">
                <User className="h-4 w-4 text-white/70" />
                <span>{task.clientName}</span>
              </div>
            ) : null}
            
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                <span className="tracking-wider">#{task.bookingCode ?? task.bookingId}</span>
                {task.zohoSalesOrderUrl ? (
                  <a
                    href={task.zohoSalesOrderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Sales order</span>
                  </a>
                ) : null}
              </div>
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
