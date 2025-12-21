import type { OperationsTask } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type OperationsTaskCardProps = {
  task: OperationsTask
  className?: string
}

export function OperationsTaskCard({ task, className }: OperationsTaskCardProps) {
  const showDescription = task.description && task.description !== "No description provided."

  return (
    <div className={cn("space-y-3 rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-[0.35em] text-muted-foreground">{task.category}</span>
        {task.priority !== "Medium" ? (
          <Badge
            variant="outline"
            className="rounded-full border-border/60 px-3 py-1 text-[11px] font-semibold text-muted-foreground font-normal"
          >
            {task.priority}
          </Badge>
        ) : null}
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{task.title}</p>
        {showDescription ? (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
        {task.bookingId ? (
          <Badge
            variant="outline"
            className="rounded-full border-border/60 px-2 py-0.5 text-[10px] font-semibold font-normal"
          >
            Booking #{task.bookingCode ?? task.bookingId}
          </Badge>
        ) : null}
        {task.clientName && task.clientName !== "Unassigned" ? (
          <Badge
            variant="outline"
            className="rounded-full border-border/60 px-2 py-0.5 text-[10px] font-semibold font-normal"
          >
            {task.clientName}
          </Badge>
        ) : null}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          <p className="font-semibold text-foreground">{task.owner}</p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">Assignee</p>
        </div>
        <div className="text-right">
          <p>{formatDate(task.createdAt)}</p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">Created</p>
        </div>
      </div>
    </div>
  )
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dubai",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value))
  } catch {
    return value
  }
}
