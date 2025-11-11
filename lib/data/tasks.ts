import { cache } from "react"

import type { Booking, OperationsTask, Task, TaskChecklistItem } from "@/lib/domain/entities"
import { getLiveBookings, getStaffAccounts, type StaffAccount } from "@/lib/data/live-data"
import { serviceClient } from "@/lib/supabase/service-client"

type TaskChecklistRow = {
  id: string
  label: string | null
  is_required: boolean | null
  is_complete: boolean | null
}

type TaskRow = {
  id: string
  title: string | null
  task_type: string | null
  status: string | null
  deadline_at: string | null
  booking_id: string | null
  vehicle_id: string | null
  client_id: string | null
  assignee_driver_id: string | null
  created_by: string | null
  sla_minutes: number | null
  metadata: Record<string, any> | null
  created_at: string | null
  updated_at: string | null
  task_checklist_items: TaskChecklistRow[] | null
}

const fetchTaskRows = cache(async (): Promise<TaskRow[]> => {
  const { data, error } = await serviceClient
    .from("tasks")
    .select(
      "id, title, task_type, status, deadline_at, booking_id, vehicle_id, client_id, assignee_driver_id, created_by, sla_minutes, metadata, created_at, updated_at, task_checklist_items(id, label, is_required, is_complete)"
    )
    .order("deadline_at", { ascending: true, nullsFirst: false })
  if (error) {
    throw new Error(`[supabase] Failed to load tasks: ${error.message}`)
  }
  return data ?? []
})

export const getOperationsTasks = cache(async (): Promise<OperationsTask[]> => {
  const [rows, bookings, staff] = await Promise.all([fetchTaskRows(), getLiveBookings(), getStaffAccounts()])
  const bookingsById = new Map(bookings.map((booking) => [String(booking.id), booking]))
  const staffById = buildStaffMap(staff)

  return rows
    .filter((row) => !isDriverTaskRow(row))
    .map((row) => toOperationsTask(row, { bookingsById, staffById }))
})

export const getOperationsTaskById = cache(async (taskId: string): Promise<OperationsTask | null> => {
  const tasks = await getOperationsTasks()
  return tasks.find((task) => String(task.id) === taskId) ?? null
})

export const getDriverTasks = cache(async (): Promise<Task[]> => {
  const [rows, bookings] = await Promise.all([fetchTaskRows(), getLiveBookings()])
  const bookingsById = new Map(bookings.map((booking) => [String(booking.id), booking]))
  return rows.filter(isDriverTaskRow).map((row) => toBaseTask(row, { bookingsById }))
})

export const getDriverTaskById = cache(async (taskId: string): Promise<Task | null> => {
  const tasks = await getDriverTasks()
  return tasks.find((task) => String(task.id) === taskId) ?? null
})

function toOperationsTask(
  row: TaskRow,
  context: { bookingsById: Map<string, Booking>; staffById: Map<string, StaffAccount> }
): OperationsTask {
  const base = toBaseTask(row, context)
  const metadata = sanitizeMetadata(row.metadata)
  const staff = row.created_by ? context.staffById.get(row.created_by) : undefined
  const checklistProgress = getChecklistProgress(base.checklist)

  return {
    ...base,
    owner: metadata.owner ?? staff?.full_name ?? "Unassigned",
    ownerRole: metadata.ownerRole ?? staff?.role ?? "Operations",
    requiredInputs: metadata.requiredInputs ?? checklistProgress,
    lastUpdate: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    channel: metadata.channel ?? "Manual",
  }
}

function toBaseTask(row: TaskRow, context: { bookingsById: Map<string, Booking> }): Task {
  const metadata = sanitizeMetadata(row.metadata)
  const checklist = mergeChecklist(row.task_checklist_items, metadata.checklist as TaskChecklistItem[] | undefined)
  const booking = row.booking_id ? context.bookingsById.get(row.booking_id) : null

  return {
    id: row.id,
    title: row.title ?? metadata.title ?? "Untitled task",
    type: normalizeTaskType(row.task_type),
    category: metadata.category ?? row.task_type ?? "general",
    status: normalizeTaskStatus(row.status),
    deadline: formatDeadline(row.deadline_at),
    bookingId: booking?.id ?? row.booking_id ?? undefined,
    bookingCode: booking?.code,
    priority: normalizePriority(metadata.priority),
    description: metadata.description ?? "No description provided.",
    checklist,
    geo: metadata.geo,
    slaMinutes: row.sla_minutes ?? 0,
  }
}

function mergeChecklist(apiItems: TaskChecklistRow[] | null, metaItems?: TaskChecklistItem[]): TaskChecklistItem[] {
  if (metaItems?.length) {
    return metaItems
  }
  if (!apiItems?.length) {
    return []
  }
  return apiItems.map((item) => ({
    id: item.id,
    label: item.label ?? "Checklist item",
    required: Boolean(item.is_required),
    completed: Boolean(item.is_complete),
  }))
}

function sanitizeMetadata(metadata: Record<string, any> | null | undefined) {
  if (!metadata || typeof metadata !== "object") {
    return {}
  }
  return metadata as Record<string, any>
}

function normalizeTaskType(value: string | null | undefined): Task["type"] {
  switch ((value ?? "delivery").toLowerCase()) {
    case "pickup":
      return "pickup"
    case "maintenance":
      return "maintenance"
    default:
      return "delivery"
  }
}

function normalizeTaskStatus(value: string | null | undefined): Task["status"] {
  switch ((value ?? "todo").toLowerCase()) {
    case "inprogress":
    case "in_progress":
      return "inprogress"
    case "done":
    case "completed":
      return "done"
    default:
      return "todo"
  }
}

function normalizePriority(value: string | null | undefined): "High" | "Medium" | "Low" {
  switch ((value ?? "medium").toLowerCase()) {
    case "high":
      return "High"
    case "low":
      return "Low"
    default:
      return "Medium"
  }
}

function formatDeadline(value: string | null): string {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("en-CA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value))
  } catch {
    return value
  }
}

function getChecklistProgress(checklist: TaskChecklistItem[]): { completed: number; total: number } {
  const total = checklist.length || 1
  const completed = checklist.filter((item) => item.completed).length
  return { completed, total }
}

function isDriverTaskRow(row: TaskRow): boolean {
  if (row.assignee_driver_id) return true
  const metadata = sanitizeMetadata(row.metadata)
  return metadata.scope === "driver"
}

function buildStaffMap(staff: StaffAccount[]): Map<string, StaffAccount> {
  return new Map(staff.map((entry) => [entry.id, entry]))
}
