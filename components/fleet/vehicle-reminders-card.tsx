import type { VehicleReminder } from "@/lib/domain/entities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatDate, titleCase } from "@/lib/formatters"

type VehicleRemindersCardProps = {
  reminders: VehicleReminder[]
}

export function VehicleRemindersCard({ reminders }: VehicleRemindersCardProps) {
  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Reminders</CardTitle>
        <CardDescription>Expiry and maintenance alerts for this vehicle.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {reminders.length === 0 ? (
            <li className="text-muted-foreground">No active reminders</li>
          ) : (
            reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{titleCase(reminder.type)}</p>
                  <p className="text-xs text-muted-foreground">Due {formatDate(reminder.dueDate)}</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", reminderTone(reminder))}>{reminder.status}</span>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}

function reminderTone(reminder: VehicleReminder) {
  if (reminder.severity === "critical" || reminder.status === "critical") return "bg-rose-100 text-rose-700"
  if (reminder.severity === "warning" || reminder.status === "warning") return "bg-amber-100 text-amber-700"
  return "bg-slate-100 text-slate-700"
}
