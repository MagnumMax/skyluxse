import { notFound } from "next/navigation"

import { DriverPageShell } from "@/components/driver-page-shell"
import { DriverTaskDetail } from "@/components/driver-task-detail"
import { getDriverTaskById, getDriverTasks } from "@/lib/data/tasks"
import { getLiveClientByIdFromDb } from "@/lib/data/live-data"
import { getAdditionalServices, getTaskServices } from "@/app/actions/additional-services"
import { createSignedUrl } from "@/lib/storage/signed-url"

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

  const kommoLeadUrl = (() => {
    const baseUrl = process.env.KOMMO_BASE_URL
    const bookingCode = task.bookingCode
    if (!bookingCode || !baseUrl) return undefined
    if (bookingCode.startsWith("K-")) {
      const leadId = bookingCode.slice(2)
      if (!leadId) return undefined
      try {
        const base = new URL(baseUrl)
        const normalizedPath = base.pathname.endsWith("/") ? base.pathname.slice(0, -1) : base.pathname
        base.pathname = `${normalizedPath}/leads/detail/${leadId}`
        return base.toString()
      } catch {
        return undefined
      }
    }
    return undefined
  })()

  let handoverPhotos: string[] = []
  if (task.type === "pickup" && task.bookingId) {
    const allTasks = await getDriverTasks()
    const deliveryTask = allTasks.find(t => t.bookingId === task.bookingId && t.type === "delivery")
    if (deliveryTask?.inputValues) {
      const photosInput = deliveryTask.inputValues.find(v => v.key === "handover_photos")
      if (photosInput?.storagePaths?.length && photosInput.bucket) {
        const urls = await Promise.all(
          photosInput.storagePaths.map(path => createSignedUrl(photosInput.bucket, path))
        )
        handoverPhotos = urls.filter((url): url is string => !!url)
      }
    }
  }

  return (
    <DriverPageShell>
      <DriverTaskDetail 
        task={task} 
        client={client ?? undefined} 
        additionalServices={additionalServices}
        availableServices={availableServices}
        kommoLeadUrl={kommoLeadUrl}
        handoverPhotos={handoverPhotos}
      />
    </DriverPageShell>
  )
}
