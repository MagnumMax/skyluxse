import { notFound } from "next/navigation"

import { DriverPageShell } from "@/components/driver-page-shell"
import { DriverTaskDetail } from "@/components/driver-task-detail"
import { getDriverTaskById } from "@/lib/data/tasks"

export default async function DriverTaskDetailPage({ params }: { params: { taskId: string } }) {
  const task = await getDriverTaskById(params.taskId)
  if (!task) notFound()
  return (
    <DriverPageShell>
      <DriverTaskDetail task={task} />
    </DriverPageShell>
  )
}
