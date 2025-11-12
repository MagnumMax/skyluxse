import { notFound } from "next/navigation"

import { DriverPageShell } from "@/components/driver-page-shell"
import { DriverTaskDetail } from "@/components/driver-task-detail"
import { getDriverTaskById } from "@/lib/data/tasks"

type PageProps = { params: Promise<{ taskId: string }> }

export default async function DriverTaskDetailPage({ params }: PageProps) {
  const { taskId } = await params
  const task = await getDriverTaskById(taskId)
  if (!task) notFound()
  return (
    <DriverPageShell>
      <DriverTaskDetail task={task} />
    </DriverPageShell>
  )
}
