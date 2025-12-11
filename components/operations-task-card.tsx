import type { OperationsTask } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type OperationsTaskCardProps = {
  task: OperationsTask
  className?: string
}

export function OperationsTaskCard({ task, className }: OperationsTaskCardProps) {
  const completionPct =
    task.requiredInputProgress.total > 0
      ? Math.round((task.requiredInputProgress.completed / task.requiredInputProgress.total) * 100)
      : 0

  return (
    <div className={cn("space-y-3 rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-[0.35em] text-muted-foreground">{task.category}</span>
        <Button
          variant="outline"
          size="sm"
          className="h-auto rounded-full border-border/60 px-3 py-1 text-[11px] font-semibold text-muted-foreground"
        >
          {task.priority}
        </Button>
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{task.title}</p>
        <p className="text-sm text-muted-foreground">{task.description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
        {task.bookingId ? (
          <Button
            variant="outline"
            size="sm"
            className="h-auto rounded-full border-border/60 px-2 py-0.5 text-[10px] font-semibold"
          >
            Booking #{task.bookingCode ?? task.bookingId}
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="h-auto rounded-full border-border/60 px-2 py-0.5 text-[10px] font-semibold"
        >
          SLA {task.slaMinutes}m
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-auto rounded-full border-border/60 px-2 py-0.5 text-[10px] font-semibold"
        >
          {task.channel}
        </Button>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Required inputs</p>
        <div className="mt-2 h-2 w-full rounded-full bg-muted" aria-hidden={task.requiredInputProgress.total === 0}>
          <div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${completionPct}%` }}
            role={task.requiredInputProgress.total === 0 ? "presentation" : "progressbar"}
            aria-valuenow={completionPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {task.requiredInputProgress.completed}/{task.requiredInputProgress.total} complete
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
