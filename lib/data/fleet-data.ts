import { unstable_noStore as noStore } from "next/cache"

import type {
  Booking,
  FleetCar,
  VehicleDocument,
  VehicleInspection,
  VehicleMaintenanceEntry,
  VehicleReminder,
} from "@/lib/domain/entities"
import { getLiveBookings, getLiveFleetVehicleById } from "@/lib/data/live-data"
import { calculateVehicleRuntimeMetrics } from "@/lib/fleet/runtime"
import { serviceClient } from "@/lib/supabase/service-client"
import { createSignedUrl } from "@/lib/storage/signed-url"

export interface FleetVehicleProfile {
  vehicle: FleetCar
  bookings: Booking[]
}

type VehicleReminderRow = {
  id: string
  reminder_type: string | null
  due_date: string | null
  status: string | null
  severity: string | null
  notes: string | null
}

type VehicleInspectionRow = {
  id: string
  inspection_date: string | null
  driver_id: string | null
  performed_by: string | null
  notes: string | null
  photo_document_ids: string[] | null
  created_at?: string | null
}

type MaintenanceJobRow = {
  id: string
  job_type: string | null
  status: string | null
  scheduled_start: string | null
  actual_start: string | null
  actual_end: string | null
  description: string | null
  odometer_start: number | null
  odometer_end: number | null
  vendor: string | null
  cost_estimate: number | null
  created_at: string | null
}

type VehicleDocumentLinkRow = {
  id: string
  doc_type: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
  document:
    | {
        id: string
        bucket: string | null
        storage_path: string | null
        file_name: string | null
        original_name?: string | null
        mime_type: string | null
        status?: string | null
        created_at: string | null
      }
    | {
        id: string
        bucket: string | null
        storage_path: string | null
        file_name: string | null
        original_name?: string | null
        mime_type: string | null
        status?: string | null
        created_at: string | null
      }[]
    | null
}

type VehicleDocumentBundle = {
  documents: VehicleDocument[]
  gallery: string[]
  assetById: Map<string, string>
}

export async function getFleetVehicleProfile(vehicleId: string): Promise<FleetVehicleProfile | null> {
  noStore()
  if (!vehicleId) {
    return null
  }

  const vehicle = await getLiveFleetVehicleById(vehicleId)
  if (!vehicle) {
    return null
  }

  const [reminders, inspectionRows, maintenanceHistory, documentBundle, bookings] = await Promise.all([
    fetchVehicleReminders(vehicleId),
    fetchVehicleInspectionRows(vehicleId),
    fetchMaintenanceHistory(vehicleId),
    fetchVehicleDocuments(vehicleId),
    getLiveBookings(),
  ])

  const vehicleBookings = bookings.filter((booking) => String(booking.carId) === String(vehicle.id))
  const inspections = inspectionRows.map((row) => mapInspectionRow(row, documentBundle.assetById))
  const { utilization, revenueYTD } = calculateVehicleRuntimeMetrics(vehicleBookings)
  const heroImage = await resolveHeroImage(vehicle.imageUrl, documentBundle)

  const enrichedVehicle: FleetCar = {
    ...vehicle,
    imageUrl: heroImage,
    utilization: vehicle.utilization || utilization,
    revenueYTD: vehicle.revenueYTD || revenueYTD,
    reminders,
    inspections,
    maintenanceHistory,
    documents: documentBundle.documents,
    documentGallery: documentBundle.gallery,
  }

  return { vehicle: enrichedVehicle, bookings: vehicleBookings }
}

async function fetchVehicleReminders(vehicleId: string): Promise<VehicleReminder[]> {
  const { data, error } = await serviceClient
    .from("vehicle_reminders")
    .select("id, reminder_type, due_date, status, severity, notes")
    .eq("vehicle_id", vehicleId)
    .order("due_date", { ascending: true })
  if (error) {
    throw new Error(`[supabase] Failed to load vehicle reminders: ${error.message}`)
  }
  return (data ?? []).map(mapReminderRow)
}

async function fetchVehicleInspectionRows(vehicleId: string): Promise<VehicleInspectionRow[]> {
  const { data, error } = await serviceClient
    .from("vehicle_inspections")
    .select("id, inspection_date, driver_id, performed_by, notes, photo_document_ids, created_at")
    .eq("vehicle_id", vehicleId)
    .order("inspection_date", { ascending: false })
  if (error) {
    throw new Error(`[supabase] Failed to load vehicle inspections: ${error.message}`)
  }
  return data ?? []
}

async function fetchMaintenanceHistory(vehicleId: string): Promise<VehicleMaintenanceEntry[]> {
  const { data, error } = await serviceClient
    .from("maintenance_jobs")
    .select(
      "id, job_type, status, scheduled_start, actual_start, actual_end, description, odometer_start, odometer_end, vendor, cost_estimate, created_at"
    )
    .eq("vehicle_id", vehicleId)
    .order("actual_start", { ascending: false, nullsFirst: false })
    .order("scheduled_start", { ascending: false, nullsFirst: false })
  if (error) {
    throw new Error(`[supabase] Failed to load maintenance jobs: ${error.message}`)
  }
  return (data ?? []).map(mapMaintenanceRow)
}

async function fetchVehicleDocuments(vehicleId: string): Promise<VehicleDocumentBundle> {
  const { data, error } = await serviceClient
    .from("document_links")
    .select(
      "id, doc_type, notes, metadata, created_at, document:documents(id, bucket, storage_path, file_name, mime_type, created_at)"
    )
    .eq("scope", "vehicle")
    .eq("entity_id", vehicleId)
    .order("created_at", { ascending: true })
  if (error) {
    throw new Error(`[supabase] Failed to load vehicle documents: ${error.message}`)
  }
  return await mapVehicleDocumentRows(data ?? [])
}

function mapReminderRow(row: VehicleReminderRow): VehicleReminder {
  return {
    id: row.id,
    type: row.reminder_type ?? "Reminder",
    dueDate: row.due_date ?? new Date().toISOString(),
    status: row.status ?? "scheduled",
    severity: row.severity ?? undefined,
    notes: row.notes ?? undefined,
  }
}

function mapInspectionRow(row: VehicleInspectionRow, assetById: Map<string, string>): VehicleInspection {
  const date = row.inspection_date ?? row.created_at ?? new Date().toISOString()
  const photos = (row.photo_document_ids ?? [])
    .map((docId) => assetById.get(docId))
    .filter((value): value is string => Boolean(value))
  return {
    date,
    driver: row.driver_id ?? undefined,
    performedBy: row.performed_by ?? undefined,
    notes: row.notes ?? undefined,
    photos,
  }
}

function mapMaintenanceRow(row: MaintenanceJobRow): VehicleMaintenanceEntry {
  const date = row.actual_start ?? row.scheduled_start ?? row.created_at ?? new Date().toISOString()
  return {
    id: row.id,
    date,
    type: row.job_type ?? "maintenance",
    odometer: row.odometer_end ?? row.odometer_start ?? undefined,
    notes: row.description ?? undefined,
    vendor: row.vendor ?? undefined,
    status: row.status ?? undefined,
    costEstimate: row.cost_estimate ?? undefined,
  }
}

async function mapVehicleDocumentRows(rows: VehicleDocumentLinkRow[]): Promise<VehicleDocumentBundle> {
  const documents: VehicleDocument[] = []
  const gallery: string[] = []
  const assetById = new Map<string, string>()

  for (const row of rows) {
    const doc = Array.isArray(row.document) ? row.document[0] : row.document
    const storagePath = doc?.storage_path ?? doc?.file_name ?? undefined
    const bucket = doc?.bucket ?? "vehicle-documents"
    const url = await createSignedUrl(bucket, storagePath)
    if (doc?.id && url) {
      assetById.set(doc.id, url)
    }
    const rawType = row.doc_type ?? "document"
    const docType = rawType.toString().toLowerCase()
    if (docType === "gallery" || docType === "photo") {
      if (url) {
        gallery.push(url)
      }
    }

    const name = doc?.original_name ?? doc?.file_name ?? titleCase(rawType)
    const expiry = undefined
    const status = doc?.status ?? "needs_review"
    documents.push({
      id: doc?.id ?? row.id,
      type: docType,
      name,
      expiry,
      status,
      url,
      notes: undefined,
      bucket,
      storagePath,
    })
  }

  return { documents, gallery, assetById }
}

async function resolveHeroImage(currentImageUrl: string | undefined, bundle: VehicleDocumentBundle) {
  if (currentImageUrl) {
    if (currentImageUrl.startsWith("http")) {
      return currentImageUrl
    }
    const [bucket, ...rest] = currentImageUrl.split("/")
    const path = rest.join("/")
    const signed = await createSignedUrl(bucket, path)
    if (signed) return signed
  }
  return bundle.gallery[0] ?? currentImageUrl
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}
