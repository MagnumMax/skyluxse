import { DriverPageShell } from "@/components/driver-page-shell"
import { DriverTaskList } from "@/components/driver-task-list"
import { getDriverTasks } from "@/lib/data/tasks"

export default async function DriverTasksPage() {
  const tasks = await getDriverTasks()
  return (
    <DriverPageShell>
      <DriverTaskList tasks={tasks} />
    </DriverPageShell>
  )
}
