import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { OperationsTaskDetail } from "@/components/operations-task-detail"
import { getOperationsTaskById } from "@/lib/data/tasks"
import { getTaskServices, getAdditionalServices } from "@/app/actions/additional-services"

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
  return (
    <OperationsTaskDetail 
        task={task} 
        additionalServices={additionalServices} 
        availableServices={availableServices} 
    />
  )
}
