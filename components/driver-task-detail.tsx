import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import type { Task } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"

const typeLabels: Record<Task["type"], string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  maintenance: "Maintenance",
}

export function DriverTaskDetail({ task }: { task: Task }) {
  const details = [
    { label: "Type", value: typeLabels[task.type] },
    { label: "Deadline", value: task.deadline },
    { label: "Priority", value: task.priority },
    task.bookingId
      ? { label: "Booking", value: `#${task.bookingCode ?? task.bookingId}` }
      : undefined,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="space-y-6 text-white">
      <Card className="rounded-3xl border border-white/15 bg-white/5 text-white shadow-lg">
        <CardHeader className="space-y-3">
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            Task
          </CardDescription>
          <CardTitle className="text-2xl text-white">{task.title}</CardTitle>
          <CardDescription className="text-sm text-white/75">{task.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-sm text-white/80">
            {details.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <dt className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">{item.label}</dt>
                <dd className="text-base font-semibold text-white">{item.value}</dd>
              </div>
            ))}
          </dl>
          {task.geo ? (
            <div className="flex flex-wrap gap-3 text-xs text-white/70">
              {task.geo.pickup ? (
                <Badge variant="outline" className="border-white/25 bg-white/5 text-white">
                  Pickup · {task.geo.pickup}
                </Badge>
              ) : null}
              {task.geo.dropoff ? (
                <Badge variant="outline" className="border-white/25 bg-white/5 text-white">
                  Drop-off · {task.geo.dropoff}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-white/15 bg-white/5 text-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-white/60">
            Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {task.checklist.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
            >
              <Checkbox
                checked={item.completed}
                disabled
                aria-readonly
                className={cn(
                  "mt-1 h-5 w-5 border-white/40",
                  "data-[state=checked]:border-emerald-400 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white"
                )}
              />
              <div className="space-y-1">
                <p className="text-sm text-white">{item.label}</p>
                {item.required ? (
                  <Badge variant="outline" className="border-rose-200 bg-rose-100/10 text-rose-100">
                    Required
                  </Badge>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
