import { cache } from "react"
import { cookies } from "next/headers"

import type {
  Booking,
  OperationsTask,
  Task,
  TaskInputValue,
  TaskRequiredInput,
} from "@/lib/domain/entities"
import {
  getBookingsByDriverId,
  getDriverProfileByEmail,
  getLiveBookingById,
  getLiveBookings,
  getLiveBookingsByIds,
  getStaffAccounts,
  type StaffAccount,
} from "@/lib/data/live-data"
import { serviceClient } from "@/lib/supabase/service-client"

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
  task_required_input_values: TaskInputValueRow[] | null
  clients: { name: string | null }[] | null
  bookings: {
    external_code: string | null
    total_amount: number | null
    deposit_amount: number | null
    advance_payment: number | null
    zoho_sales_order_id: string | null
    sales_order_url: string | null
    client_id: string | null
    vehicle_id: string | null
  }[] | null
  vehicles: {
    name: string | null
    plate_number: string | null
  }[] | null
}

type TaskInputValueRow = {
  key: string | null
  value_number: number | null
  value_text: string | null
  value_json: Record<string, any> | null
  storage_paths: string[] | null
  bucket: string | null
}

const fetchTaskRows = cache(async (filters?: { driverId?: string; bookingId?: string }): Promise<TaskRow[]> => {
  let query = serviceClient
    .from("tasks")
    .select(
      `id, title, task_type, status, deadline_at, booking_id, vehicle_id, client_id, assignee_driver_id, created_by, sla_minutes, metadata, created_at, updated_at, 
      task_required_input_values(key, value_number, value_text, value_json, storage_paths, bucket), 
      clients(name),
      bookings:booking_id(external_code, total_amount, deposit_amount, advance_payment, zoho_sales_order_id, sales_order_url, client_id, vehicle_id),
      vehicles:vehicle_id(name, plate_number)`
    )
    .order("deadline_at", { ascending: true, nullsFirst: false })

  if (filters?.driverId) {
    query = query.eq("assignee_driver_id", filters.driverId)
  }
  if (filters?.bookingId) {
    query = query.eq("booking_id", filters.bookingId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`[supabase] Failed to load tasks: ${error.message}`)
  }
  return data ?? []
})

export const getOperationsTasks = cache(async (options?: { includeDriverTasks?: boolean }): Promise<OperationsTask[]> => {
  const [rows, bookings, staff] = await Promise.all([fetchTaskRows(), getLiveBookings(), getStaffAccounts()])
  const bookingsById = new Map(bookings.map((booking) => [String(booking.id), booking]))
  const odometerByVehicle = buildOdometerMap(rows)
  const fuelByVehicle = buildFuelMap(rows)
  const staffById = buildStaffMap(staff)

  return rows
    .filter((row) => options?.includeDriverTasks || !isDriverTaskRow(row))
    .map((row) => toOperationsTask(row, { bookingsById, staffById, odometerByVehicle, fuelByVehicle }))
})

export const getOperationsTaskById = cache(async (taskId: string): Promise<OperationsTask | null> => {
  const tasks = await getOperationsTasks({ includeDriverTasks: true })
  return tasks.find((task) => String(task.id) === taskId) ?? null
})

export const getDriverTasks = cache(async (): Promise<Task[]> => {
  const cookieStore = await cookies()
  const email = cookieStore.get("skyluxse_driver_email")?.value

  let driverId: string | undefined
  if (email) {
    const profile = await getDriverProfileByEmail(email)
    if (profile) {
      driverId = profile.id
    }
  }

  // If we found a driver ID, use it to filter tasks and bookings
  const rows = await fetchTaskRows({ driverId })

  const odometerByVehicle = buildOdometerMap(rows)
  const fuelByVehicle = buildFuelMap(rows)

  return rows
    .filter((row) => {
      // If we are logged in as a driver, only show tasks assigned to me
      if (driverId) {
        return row.assignee_driver_id === driverId
      }
      // Fallback: show all driver tasks if not logged in (legacy behavior, but dangerous for perf)
      // Ideally we should return empty if not logged in, but let's keep it safe for now
      return isDriverTaskRow(row)
    })
    .map((row) => toBaseTask(row, { odometerByVehicle, fuelByVehicle }))
})

export const getDriverTaskById = cache(async (taskId: string): Promise<Task | null> => {
  const tasks = await getDriverTasks()
  return tasks.find((task) => String(task.id) === taskId) ?? null
})

export const getBookingRelatedTasks = cache(async (bookingId: string): Promise<Task[]> => {
  const [rows, booking] = await Promise.all([
    fetchTaskRows({ bookingId }),
    getLiveBookingById(bookingId),
  ])

  if (!booking) return []

  const bookingsById = new Map([[String(booking.id), booking]])
  const odometerByVehicle = buildOdometerMap(rows)
  const fuelByVehicle = buildFuelMap(rows)
  return rows.map((row) => toBaseTask(row, { bookingsById, odometerByVehicle, fuelByVehicle }))
})

export const getVehicleMaxOdometer = cache(async (vehicleId: string): Promise<number | null> => {
  // 1. Try to get max from completed tasks (most reliable recent data)
  const { data: taskData, error: taskError } = await serviceClient
    .from("task_required_input_values")
    .select(`
      value_number,
      tasks!inner (
        vehicle_id,
        status
      )
    `)
    .eq("tasks.vehicle_id", vehicleId)
    .eq("tasks.status", "done")
    .ilike("key", "odo%")
    .not("value_number", "is", null)
    .order("value_number", { ascending: false })
    .limit(1)

  if (taskError) {
    console.error("Failed to fetch max odometer from tasks", taskError)
  }

  if (taskData?.[0]?.value_number) {
    return taskData[0].value_number
  }

  // 2. Fallback to vehicle registry mileage
  const { data: vehicleData, error: vehicleError } = await serviceClient
    .from("vehicles")
    .select("mileage_km")
    .eq("id", vehicleId)
    .single()

  if (vehicleError) {
    console.error("Failed to fetch vehicle mileage", vehicleError)
    return null
  }

  return vehicleData?.mileage_km ?? null
})

export const getTasksByBookingId = cache(async (bookingId: string): Promise<{ pickupMiles: number; pickupFuel: number; returnMiles: number; returnFuel: number; tasks: OperationsTask[] }> => {
  const [rows, booking, staff] = await Promise.all([
    fetchTaskRows({ bookingId }),
    getLiveBookingById(bookingId),
    getStaffAccounts(),
  ])

  if (!booking) {
    return {
      pickupMiles: 0,
      pickupFuel: 0,
      returnMiles: 0,
      returnFuel: 0,
      tasks: [],
    }
  }

  const bookingsById = new Map([[String(booking.id), booking]])
  const staffById = buildStaffMap(staff)
  const odometerByVehicle = buildOdometerMap(rows)
  const fuelByVehicle = buildFuelMap(rows)

  const tasks = rows.map((row) => toOperationsTask(row, { bookingsById, staffById, odometerByVehicle, fuelByVehicle }))

  let pickupMaxOdo: number | undefined
  let pickupLatestFuel: { value: number; ts: number } | undefined
  let returnMaxOdo: number | undefined
  let returnLatestFuel: { value: number; ts: number } | undefined

  for (const row of rows) {
    const type = normalizeTaskType(row.task_type)
    const odo = extractOdometerValue(row.task_required_input_values)
    const fuel = extractFuelValue(row.task_required_input_values)
    const ts = getTimestamp(row)
    const numericFuel = fuel ? Number(fuel.value) : NaN

    if (type === "delivery") {
      // Pickup
      if (odo !== undefined) {
        pickupMaxOdo = pickupMaxOdo === undefined ? odo : Math.max(pickupMaxOdo, odo)
      }
      if (Number.isFinite(numericFuel)) {
        const fuelRecord = { value: numericFuel, ts: ts ? new Date(ts).getTime() : Date.now() }
        pickupLatestFuel = selectLatestFuel(pickupLatestFuel, fuelRecord)
      }
    } else if (type === "pickup") {
      // Return
      if (odo !== undefined) {
        returnMaxOdo = returnMaxOdo === undefined ? odo : Math.max(returnMaxOdo, odo)
      }
      if (Number.isFinite(numericFuel)) {
        const fuelRecord = { value: numericFuel, ts: ts ? new Date(ts).getTime() : Date.now() }
        returnLatestFuel = selectLatestFuel(returnLatestFuel, fuelRecord)
      }
    }
  }

  return {
    pickupMiles: pickupMaxOdo ?? 0,
    pickupFuel: pickupLatestFuel?.value ?? 0,
    returnMiles: returnMaxOdo ?? 0,
    returnFuel: returnLatestFuel?.value ?? 0,
    tasks,
  }
})

function toOperationsTask(
  row: TaskRow,
  context: {
    bookingsById: Map<string, Booking>
    staffById: Map<string, StaffAccount>
    odometerByVehicle: Map<string, number>
    fuelByVehicle: Map<string, { value: number; ts: number }>
  }
): OperationsTask {
  const base = toBaseTask(row, context)
  const metadata = sanitizeMetadata(row.metadata)
  const staff = row.created_by ? context.staffById.get(row.created_by) : undefined
  const requiredInputProgress = deriveRequiredInputProgress(metadata, base.requiredInputs, base.inputValues)

  return {
    ...base,
    owner: metadata.owner ?? staff?.full_name ?? "Unassigned",
    ownerRole: metadata.ownerRole ?? staff?.role ?? "Operations",
    requiredInputProgress: requiredInputProgress,
    lastUpdate: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    channel: metadata.channel ?? "Manual",
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

function toBaseTask(
  row: TaskRow,
  context: { bookingsById?: Map<string, Booking>; odometerByVehicle: Map<string, number>; fuelByVehicle: Map<string, { value: number; ts: number }> }
): Task {
  const metadata = sanitizeMetadata(row.metadata)
  const booking = row.booking_id && context.bookingsById ? context.bookingsById.get(row.booking_id) : null
  const joinedBooking = row.bookings?.[0]
  const joinedVehicle = row.vehicles?.[0]

  const requiredInputs = extractRequiredInputs(metadata)
  const inputValues = mergeInputValues(row.task_required_input_values)
  const odometer = extractOdometerValue(row.task_required_input_values)
  const fuel = extractFuelValue(row.task_required_input_values)
  if (row.vehicle_id && odometer !== undefined) {
    const current = context.odometerByVehicle.get(row.vehicle_id)
    const next = current === undefined ? odometer : Math.max(current, odometer)
    context.odometerByVehicle.set(row.vehicle_id, next)
  }
  if (row.vehicle_id && fuel) {
    const current = context.fuelByVehicle.get(row.vehicle_id)
    const ts = getTimestamp(row)
    const numeric = Number(fuel.value)
    if (Number.isFinite(numeric)) {
      const next = selectLatestFuel(current, { value: numeric, ts: ts ? new Date(ts).getTime() : Date.now() })
      context.fuelByVehicle.set(row.vehicle_id, next)
    }
  }

  const zohoSalesOrderId = booking?.zohoSalesOrderId ?? joinedBooking?.zoho_sales_order_id
  const zohoOrgId = process.env.ZOHO_ORG_ID
  const zohoSalesOrderUrl =
    booking?.salesOrderUrl ??
    joinedBooking?.sales_order_url ??
    (zohoSalesOrderId && zohoOrgId ? `https://books.zoho.com/app/${zohoOrgId}#/salesorders/${zohoSalesOrderId}` : undefined)

  const outstandingAmount = booking
    ? Math.max(0, (booking.totalAmount ?? 0) - (booking.paidAmount ?? 0))
    : Math.max(0, (joinedBooking?.total_amount ?? 0) - ((joinedBooking?.advance_payment ?? 0) + (joinedBooking?.deposit_amount ?? 0)))

  return {
    id: row.id,
    title: row.title ?? metadata.title ?? "Untitled task",
    type: normalizeTaskType(row.task_type),
    category: metadata.category ?? row.task_type ?? "general",
    status: normalizeTaskStatus(row.status),
    deadline: formatDeadline(row.deadline_at),
    bookingId: booking?.id ?? row.booking_id ?? undefined,
    bookingCode: booking?.code ?? joinedBooking?.external_code ?? undefined,
    clientId: booking?.clientId ?? row.client_id ?? undefined,
    clientName: booking?.clientName ?? row.clients?.[0]?.name ?? "Unassigned",
    vehicleName: (booking?.carName ?? joinedVehicle?.name) || undefined,
    vehiclePlate: booking?.carPlate ?? joinedVehicle?.plate_number ?? undefined,
    vehicleId: row.vehicle_id ?? undefined,
    lastVehicleOdometer: row.vehicle_id ? context.odometerByVehicle.get(row.vehicle_id) : undefined,
    lastVehicleFuel: row.vehicle_id ? context.fuelByVehicle.get(row.vehicle_id)?.value ?? undefined : undefined,
    priority: normalizePriority(metadata.priority),
    description: metadata.description ?? "No description provided.",
    geo: metadata.geo,
    slaMinutes: row.sla_minutes ?? 0,
    requiredInputs,
    inputValues,
    outstandingAmount,
    currency: booking?.billing?.currency ?? "AED",
    zohoSalesOrderId: zohoSalesOrderId ?? undefined,
    zohoSalesOrderUrl: zohoSalesOrderUrl ?? undefined,
  }
}

function sanitizeMetadata(metadata: Record<string, any> | null | undefined) {
  if (!metadata || typeof metadata !== "object") {
    return {}
  }
  return metadata as Record<string, any>
}

function extractRequiredInputs(metadata: Record<string, any>): TaskRequiredInput[] | undefined {
  const inputs = metadata.requiredInputs
  if (!Array.isArray(inputs)) return undefined
  return inputs
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const key = String(entry.key ?? "")
      const label = String(entry.label ?? entry.key ?? "Input")
      const normalized = `${key} ${label}`.toLowerCase()
      if (shouldSkipSignatureField(key, label)) return null
      return {
        key,
        label,
        type: (entry.type as TaskRequiredInput["type"]) ?? "text",
        required: Boolean(entry.required),
        multiple: Boolean(entry.multiple),
        accept: entry.accept ? String(entry.accept) : undefined,
        options: Array.isArray(entry.options) ? entry.options.map((opt: any) => String(opt)) : undefined,
      } satisfies TaskRequiredInput
    })
    .filter(Boolean) as TaskRequiredInput[]
}

function mergeInputValues(rows: TaskInputValueRow[] | null): TaskInputValue[] | undefined {
  if (!rows?.length) return undefined
  return rows.map((row) => ({
    key: row.key ?? "",
    valueNumber: row.value_number,
    valueText: row.value_text,
    valueJson: row.value_json ?? undefined,
    storagePaths: row.storage_paths ?? undefined,
    bucket: row.bucket ?? undefined,
  }))
}

function extractOdometerValue(rows: TaskInputValueRow[] | null): number | undefined {
  if (!rows?.length) return undefined
  const odometers = rows
    .filter((row) => {
      const key = row.key?.toLowerCase() ?? ""
      return key.startsWith("odo")
    })
    .map((row) => row.value_number)
    .filter((v): v is number => typeof v === "number")
  if (!odometers.length) return undefined
  return Math.max(...odometers)
}

function buildOdometerMap(rows: TaskRow[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    if (!row.vehicle_id) continue
    const odo = extractOdometerValue(row.task_required_input_values)
    if (odo === undefined) continue
    const current = map.get(row.vehicle_id)
    map.set(row.vehicle_id, current === undefined ? odo : Math.max(current, odo))
  }
  return map
}

function extractFuelValue(rows: TaskInputValueRow[] | null): { value: string; key: string } | undefined {
  if (!rows?.length) return undefined
  const fuelRow = rows.find((row) => {
    const key = row.key?.toLowerCase() ?? ""
    return key.includes("fuel")
  })
  if (fuelRow?.value_number !== null && fuelRow?.value_number !== undefined) {
    return { value: String(fuelRow.value_number), key: fuelRow.key ?? "fuel_level" }
  }
  if (!fuelRow?.value_text) return undefined
  return { value: fuelRow.value_text, key: fuelRow.key ?? "fuel_level" }
}

function selectLatestFuel(
  current: { value: number; ts: number } | undefined,
  next: { value: number; ts: number }
): { value: number; ts: number } {
  if (!current) return next
  return next.ts >= current.ts ? next : current
}

function buildFuelMap(rows: TaskRow[]): Map<string, { value: number; ts: number }> {
  const map = new Map<string, { value: number; ts: number }>()
  for (const row of rows) {
    if (!row.vehicle_id) continue
    const type = normalizeTaskType(row.task_type)
    if (type !== "delivery") continue
    const fuel = extractFuelValue(row.task_required_input_values)
    if (!fuel) continue
    const ts = getTimestamp(row)
    const numeric = Number(fuel.value)
    if (!Number.isFinite(numeric)) continue
    const record = selectLatestFuel(map.get(row.vehicle_id), { value: numeric, ts: ts ? new Date(ts).getTime() : Date.now() })
    map.set(row.vehicle_id, record)
  }
  return map
}

function getTimestamp(row: TaskRow): string | null {
  return row.updated_at ?? row.created_at ?? row.deadline_at ?? null
}

function deriveRequiredInputProgress(
  metadata: Record<string, any>,
  requiredInputs?: TaskRequiredInput[],
  inputValues?: TaskInputValue[]
): { completed: number; total: number } {
  const metaProgress = metadata.requiredInputs
  if (metaProgress && typeof metaProgress === "object" && !Array.isArray(metaProgress)) {
    const completed = Number(metaProgress.completed ?? 0)
    const total = Number(metaProgress.total ?? 0)
    return sanitizeProgress(completed, total)
  }
  return computeInputProgress(requiredInputs, inputValues)
}

function computeInputProgress(requiredInputs?: TaskRequiredInput[], inputValues?: TaskInputValue[]) {
  if (!requiredInputs?.length) return { completed: 0, total: 0 }
  const completed = requiredInputs.filter((input) => {
    const value = inputValues?.find((entry) => entry.key === input.key)
    if (!value) return false
    if (value.storagePaths?.length) return true
    if (value.valueNumber !== null && value.valueNumber !== undefined) return true
    if (value.valueText && value.valueText.length) return true
    if (value.valueJson && Object.keys(value.valueJson).length) return true
    return false
  }).length
  return { completed, total: requiredInputs.length }
}

function sanitizeProgress(completed: number, total: number) {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0
  if (safeTotal === 0) {
    return { completed: 0, total: 0 }
  }
  const safeCompleted = Number.isFinite(completed) ? Math.min(Math.max(completed, 0), safeTotal) : 0
  return { completed: safeCompleted, total: safeTotal }
}

function shouldSkipSignatureField(key: string, label: string) {
  const normalized = `${key} ${label}`.toLowerCase()
  return normalized.includes("signature")
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
      timeZone: "Asia/Dubai",
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

function isDriverTaskRow(row: TaskRow): boolean {
  if (row.assignee_driver_id) return true
  const metadata = sanitizeMetadata(row.metadata)
  return metadata.scope === "driver"
}

function buildStaffMap(staff: StaffAccount[]): Map<string, StaffAccount> {
  return new Map(staff.map((entry) => [entry.id, entry]))
}
