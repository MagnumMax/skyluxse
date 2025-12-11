import Link from "next/link"

import type { OperationsTask } from "@/lib/domain/entities"
import { BOOKING_PRIORITIES } from "@/lib/constants/bookings"
import { DashboardHeaderSlot } from "@/components/dashboard-header-context"
import { OperationsTaskCard } from "@/components/operations-task-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ParameterList, type ParameterListItem } from "@/components/parameter-list"

export function OperationsTaskDetail({ task }: { task: OperationsTask }) {
  const priorityMeta = BOOKING_PRIORITIES[task.priority.toLowerCase() as keyof typeof BOOKING_PRIORITIES] ?? {
    label: task.priority,
    className: "bg-slate-200 text-slate-700",
  }
  const completionPct = task.requiredInputProgress.total
    ? Math.round((task.requiredInputProgress.completed / task.requiredInputProgress.total) * 100)
    : 0
  return (
    <div className="space-y-6">
      <DashboardHeaderSlot>{null}</DashboardHeaderSlot>

      <Button asChild variant="outline" size="sm" className="rounded-full px-4 py-2">
        <Link href="/tasks">← Back to tasks</Link>
      </Button>

      <OperationsTaskCard task={task} />

      <Card className="rounded-[26px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Task summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ParameterList items={buildTaskParameters(task, priorityMeta.label)} columns={3} />
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{task.description}</p>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Required inputs</CardTitle>
          <CardDescription>
            {task.requiredInputProgress.total > 0
              ? `${task.requiredInputProgress.completed}/${task.requiredInputProgress.total} captured`
              : "No required inputs configured"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {task.requiredInputProgress.total > 0 ? (
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          ) : null}
          {task.geo ? (
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              {task.geo.pickup ? <p>Pickup: {task.geo.pickup}</p> : null}
              {task.geo.dropoff ? <p>Drop-off: {task.geo.dropoff}</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function buildTaskParameters(task: OperationsTask, priorityLabel: string): ParameterListItem[] {
  return [
    { label: "Owner", value: task.owner, helper: task.ownerRole },
    { label: "Priority", value: priorityLabel },
    { label: "Status", value: task.status },
    { label: "Deadline", value: task.deadline, helper: `SLA ${task.slaMinutes} minutes` },
    {
      label: "Related booking",
      value: task.bookingId ? (
        <Link href={`/bookings/${String(task.bookingId)}?view=operations`} className="text-sm font-semibold text-primary hover:underline">
          Open booking #{task.bookingCode ?? task.bookingId}
        </Link>
      ) : (
        "No linked booking"
      ),
    },
    { label: "Channel", value: task.channel },
  ]
}
