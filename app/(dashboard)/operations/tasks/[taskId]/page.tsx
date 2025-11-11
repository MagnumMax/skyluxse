import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { OperationsTaskDetail } from "@/components/operations-task-detail"
import { getOperationsTaskById } from "@/lib/data/tasks"

type PageProps = { params: { taskId: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const task = await getOperationsTaskById(params.taskId)
  return {
    title: task ? `${task.title} · Task detail` : `Task ${params.taskId}`,
  }
}

export default async function OperationsTaskDetailPage({ params }: PageProps) {
  const task = await getOperationsTaskById(params.taskId)
  if (!task) {
    notFound()
  }
  return <OperationsTaskDetail task={task} />
}
