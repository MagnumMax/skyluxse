import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { OperationsTaskDetail } from "@/components/operations-task-detail"
import { getBookingRelatedTasks, getOperationsTaskById } from "@/lib/data/tasks"
import { getAdditionalServices, getTaskServices } from "@/app/actions/additional-services"
import { createSignedUrl } from "@/lib/storage/signed-url"

type PageProps = { params: Promise<{ taskId: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { taskId } = await params
  const task = await getOperationsTaskById(taskId)
  return {
    title: task ? `${task.title} · Task detail` : `Task ${taskId}`,
  }
}

export default async function OperationsTaskDetailPage({ params }: PageProps) {
  const { taskId } = await params
  const [task, additionalServices, availableServices] = await Promise.all([
    getOperationsTaskById(taskId),
    getTaskServices(taskId),
    getAdditionalServices()
  ])
  
  if (!task) {
    notFound()
  }

  let handoverPhotos: string[] = []
  if (task.type === "pickup" && task.bookingId) {
    const bookingTasks = await getBookingRelatedTasks(String(task.bookingId))
    const deliveryTask = bookingTasks.find((t) => t.type === "delivery")
    if (deliveryTask?.inputValues) {
      const photosInput = deliveryTask.inputValues.find((v) => v.key === "handover_photos")
      if (photosInput?.storagePaths?.length && photosInput.bucket) {
        const urls = await Promise.all(
          photosInput.storagePaths.map(path => createSignedUrl(photosInput.bucket, path))
        )
        handoverPhotos = urls.filter((url): url is string => !!url)
      }
    }
  }

  return (
    <OperationsTaskDetail 
        task={task} 
        additionalServices={additionalServices} 
        availableServices={availableServices}
        handoverPhotos={handoverPhotos}
    />
  )
}
