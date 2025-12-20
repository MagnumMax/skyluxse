import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DriverTaskDetail } from "@/components/driver-task-detail"
import { getBookingRelatedTasks, getOperationsTaskById, getVehicleMaxOdometer } from "@/lib/data/tasks"
import { getAdditionalServices, getTaskServices } from "@/app/actions/additional-services"
import { getLiveClientByIdFromDb } from "@/lib/data/live-data"
import { createSignedUrl } from "@/lib/storage/signed-url"

type PageProps = { 
  params: Promise<{ taskId: string }> 
  searchParams?: Promise<{ backHref?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { taskId } = await params
  const task = await getOperationsTaskById(taskId)
  return {
    title: task ? `${task.title} · Task detail` : `Task ${taskId}`,
  }
}

export default async function OperationsTaskDetailPage({ params, searchParams }: PageProps) {
  const { taskId } = await params
  const { backHref } = searchParams ? await searchParams : { backHref: undefined }
  const task = await getOperationsTaskById(taskId)
  
  if (!task) {
    notFound()
  }

  const [client, additionalServices, availableServices, minOdometer] = await Promise.all([
    task.clientId ? getLiveClientByIdFromDb(String(task.clientId)).catch(() => null) : Promise.resolve(null),
    getTaskServices(taskId),
    getAdditionalServices(),
    task.vehicleId ? getVehicleMaxOdometer(String(task.vehicleId)).catch(() => null) : Promise.resolve(null)
  ])

  let handoverPhotos: string[] = []
  if (task.type === "pickup" && task.bookingId) {
    const bookingTasks = await getBookingRelatedTasks(String(task.bookingId))
    const deliveryTask = bookingTasks.find((t) => t.type === "delivery")
    if (deliveryTask?.inputValues) {
      const photosInput = deliveryTask.inputValues.find((v) => v.key === "handover_photos")
      if (photosInput?.storagePaths?.length) {
        const bucket = photosInput.bucket ?? "task-media"
        const urls = await Promise.all(
          photosInput.storagePaths.map(path => createSignedUrl(bucket, path))
        )
        handoverPhotos = urls.filter((url): url is string => !!url)
      }
    }
  }

  return (
    <DriverTaskDetail 
        task={task} 
        client={client ?? undefined}
        additionalServices={additionalServices} 
        availableServices={availableServices}
        handoverPhotos={handoverPhotos}
        minOdometer={minOdometer ?? undefined}
        backHref={backHref}
    />
  )
}

