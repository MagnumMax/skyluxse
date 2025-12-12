import { notFound } from "next/navigation"

import { DriverPageShell } from "@/components/driver-page-shell"
import { DriverTaskDetail } from "@/components/driver-task-detail"
import { getDriverTaskById } from "@/lib/data/tasks"
import { getLiveClientByIdFromDb } from "@/lib/data/live-data"

type PageProps = { params: Promise<{ taskId: string }> }

export default async function DriverTaskDetailPage({ params }: PageProps) {
  const { taskId } = await params
  const task = await getDriverTaskById(taskId)
  if (!task) notFound()
  const client = task.clientId ? await getLiveClientByIdFromDb(String(task.clientId)) : null
  return (
    <DriverPageShell>
      <DriverTaskDetail task={task} client={client ?? undefined} />
    </DriverPageShell>
  )
}
