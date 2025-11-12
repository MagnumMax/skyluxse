export const dynamic = "force-dynamic" // Tasks board tracks SLA timers; force fresh render each request.

import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { OperationsTasksBoard } from "@/components/operations-tasks-board"
import { getOperationsTasks } from "@/lib/data/tasks"

export default async function OperationsTasksPage() {
  const tasks = await getOperationsTasks()
  return (
    <DashboardPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Tasks & SLA board</h1>
        </div>
      </header>

      <OperationsTasksBoard tasks={tasks} />
    </DashboardPageShell>
  )
}
