import Link from "next/link"

import type { OperationsTask } from "@/lib/domain/entities"
import { BOOKING_PRIORITIES } from "@/lib/constants/bookings"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

const statusTone: Record<OperationsTask["status"], string> = {
  todo: "bg-slate-100 text-slate-700",
  inprogress: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
}

export function OperationsTaskDetail({ task }: { task: OperationsTask }) {
  const priorityMeta = BOOKING_PRIORITIES[task.priority.toLowerCase() as keyof typeof BOOKING_PRIORITIES] ?? {
    label: task.priority,
    className: "bg-slate-200 text-slate-700",
  }
  const completionPct = task.requiredInputs.total
    ? Math.round((task.requiredInputs.completed / task.requiredInputs.total) * 100)
    : 0
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{task.title}</h1>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusTone[task.status])}>{task.status}</span>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", priorityMeta.className)}>{priorityMeta.label}</span>
        </div>
        <p className="text-sm text-muted-foreground">Channel: {task.channel} · Last update {new Date(task.lastUpdate).toLocaleString()}</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-[24px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold text-foreground">{task.owner}</p>
            <p className="text-xs text-muted-foreground">{task.ownerRole}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Deadline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold text-foreground">{task.deadline}</p>
            <p className="text-xs text-muted-foreground">SLA {task.slaMinutes} minutes</p>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Related booking</CardTitle>
          </CardHeader>
          <CardContent>
            {task.bookingId ? (
              <Link
                href={`/bookings/${String(task.bookingId)}?view=operations`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Open booking #{task.bookingCode ?? task.bookingId}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No linked booking</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[28px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{task.description}</p>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[28px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Checklist</CardTitle>
            <CardDescription>Read-only checklist snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {task.checklist.map((item) => (
              <label key={item.id} className="flex items-center gap-3 text-sm text-foreground">
                <Checkbox checked={item.completed} disabled />
                <span>
                  {item.label}
                  {item.required ? <span className="text-xs text-rose-500"> · Required</span> : null}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Required inputs</CardTitle>
            <CardDescription>
              {task.requiredInputs.completed}/{task.requiredInputs.total} captured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            {task.geo ? (
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                {task.geo.pickup ? <p>Pickup: {task.geo.pickup}</p> : null}
                {task.geo.dropoff ? <p>Drop-off: {task.geo.dropoff}</p> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function toRoute(path: string) {
  return path as Parameters<typeof Link>[0]["href"]
}
