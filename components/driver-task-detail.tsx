import type { Task } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"

export function DriverTaskDetail({ task }: { task: Task }) {
  return (
    <div className="space-y-6 text-white">
      <section className="rounded-3xl border border-white/15 bg-white/5 p-5 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Task</p>
        <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
        <p className="text-sm text-white/70">{task.description}</p>
        <dl className="mt-4 grid gap-3 text-sm text-white/70">
          <div className="flex items-center justify-between">
            <dt>Type</dt>
            <dd className="text-white">{task.type}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Deadline</dt>
            <dd className="text-white">{task.deadline}</dd>
          </div>
          {task.bookingId ? (
            <div className="flex items-center justify-between">
              <dt>Booking</dt>
              <dd className="text-white">#{task.bookingCode ?? task.bookingId}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-3xl border border-white/15 bg-white/5 p-5 shadow-lg">
        <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-white/60">Checklist</h2>
        <ul className="mt-3 space-y-2">
          {task.checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-2">
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                  item.completed ? "border-emerald-400 bg-emerald-500" : "border-white/40"
                )}
              />
              <div>
                <p className="text-sm text-white">{item.label}</p>
                {item.required ? <p className="text-xs text-rose-200">Required</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
