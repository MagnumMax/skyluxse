import { DriverPageShell } from "@/components/driver-page-shell"
import { DriverTasksView } from "@/components/driver-tasks-view"
import { getDriverTasks } from "@/lib/data/tasks"

export default async function DriverTasksPage() {
  const tasks = await getDriverTasks()
  return (
    <DriverPageShell>
      <DriverTasksView tasks={tasks} />
    </DriverPageShell>
  )
}
