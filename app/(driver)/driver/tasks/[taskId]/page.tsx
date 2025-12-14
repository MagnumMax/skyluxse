import { notFound } from "next/navigation"

import { DriverPageShell } from "@/components/driver-page-shell"
import { DriverTaskDetail } from "@/components/driver-task-detail"
import { getDriverTaskById } from "@/lib/data/tasks"
import { getLiveClientByIdFromDb } from "@/lib/data/live-data"
import { getAdditionalServices, getTaskServices } from "@/app/actions/additional-services"

type PageProps = { params: Promise<{ taskId: string }> }

export default async function DriverTaskDetailPage({ params }: PageProps) {
  const { taskId } = await params
  const task = await getDriverTaskById(taskId)
  if (!task) notFound()
  
  const [client, additionalServices, availableServices] = await Promise.all([
    task.clientId ? getLiveClientByIdFromDb(String(task.clientId)).catch(() => null) : Promise.resolve(null),
    getTaskServices(taskId).catch(() => []),
    getAdditionalServices().catch(() => [])
  ])

  return (
    <DriverPageShell>
      <DriverTaskDetail 
        task={task} 
        client={client ?? undefined} 
        additionalServices={additionalServices}
        availableServices={availableServices}
      />
    </DriverPageShell>
  )
}
