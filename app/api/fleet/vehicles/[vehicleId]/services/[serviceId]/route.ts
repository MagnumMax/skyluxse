import { NextResponse } from "next/server"

import { getVehicleServices } from "@/lib/data/fleet-data"
import { serviceClient } from "@/lib/supabase/service-client"

type RouteParams = { params: Promise<{ vehicleId: string; serviceId: string }> }

type ServiceUpdatePayload = {
  type?: "maintenance" | "repair"
  location?: string
  plannedStart?: string
  plannedEnd?: string
  notes?: string
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { vehicleId, serviceId } = await params
  if (!vehicleId || !serviceId) {
    return NextResponse.json({ error: "Vehicle ID and service ID are required" }, { status: 400 })
  }

  const body = await safeJson(request)
  const parsed = parseServiceUpdatePayload(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  let existing
  try {
    existing = await fetchServiceRow(vehicleId, serviceId)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load service" }, { status: 500 })
  }

  if (!existing) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 })
  }

  const nextStart = parsed.value.plannedStart ?? existing.scheduled_start ?? existing.actual_start
  const nextEnd = parsed.value.plannedEnd ?? existing.scheduled_end ?? existing.actual_end ?? nextStart

  if (nextStart && nextEnd && new Date(nextStart).getTime() > new Date(nextEnd).getTime()) {
    return NextResponse.json({ error: "Planned start must be before end" }, { status: 400 })
  }

  const updatePayload: Record<string, unknown> = {}
  if (parsed.value.type) updatePayload.job_type = parsed.value.type
  if (parsed.value.location) updatePayload.location = parsed.value.location
  if (parsed.value.plannedStart) updatePayload.scheduled_start = parsed.value.plannedStart
  if (parsed.value.plannedEnd) updatePayload.scheduled_end = parsed.value.plannedEnd
  if (parsed.value.notes !== undefined) updatePayload.description = parsed.value.notes

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const { error } = await serviceClient
    .from("maintenance_jobs")
    .update(updatePayload)
    .eq("id", serviceId)
    .eq("vehicle_id", vehicleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const services = await getVehicleServices(vehicleId)
  return NextResponse.json({ service: services.find((entry) => entry.id === serviceId) ?? null, services })
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const { vehicleId, serviceId } = await params
  if (!vehicleId || !serviceId) {
    return NextResponse.json({ error: "Vehicle ID and service ID are required" }, { status: 400 })
  }

  let documents: ServiceDocumentRow[] = []
  try {
    documents = await fetchServiceDocuments(serviceId)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load documents" }, { status: 500 })
  }

  const { error: linkError } = await serviceClient
    .from("document_links")
    .delete()
    .eq("scope", "maintenance_job")
    .eq("entity_id", serviceId)
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  const { error: deleteError } = await serviceClient
    .from("maintenance_jobs")
    .delete()
    .eq("id", serviceId)
    .eq("vehicle_id", vehicleId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  await cleanupOrphanDocuments(documents, serviceId)

  const services = await getVehicleServices(vehicleId)
  return NextResponse.json({ services })
}

async function fetchServiceRow(vehicleId: string, serviceId: string) {
  const { data, error } = await serviceClient
    .from("maintenance_jobs")
    .select("id, job_type, scheduled_start, scheduled_end, actual_start, actual_end, location")
    .eq("id", serviceId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle()
  if (error) {
    throw new Error(`[supabase] Failed to load service ${serviceId}: ${error.message}`)
  }
  return data as
    | {
        id: string
        job_type: string | null
        scheduled_start: string | null
        scheduled_end: string | null
        actual_start: string | null
        actual_end: string | null
        location: string | null
      }
    | null
}

type ServiceDocumentRow = {
  document_id: string
  document:
    | { id: string; bucket: string | null; storage_path: string | null; file_name: string | null }
    | { id: string; bucket: string | null; storage_path: string | null; file_name: string | null }[]
    | null
}

async function fetchServiceDocuments(serviceId: string): Promise<ServiceDocumentRow[]> {
  const { data, error } = await serviceClient
    .from("document_links")
    .select("document_id, document:documents(id, bucket, storage_path, file_name)")
    .eq("scope", "maintenance_job")
    .eq("entity_id", serviceId)
  if (error) {
    throw new Error(`[supabase] Failed to load service documents: ${error.message}`)
  }
  return (data ?? []) as ServiceDocumentRow[]
}

async function cleanupOrphanDocuments(documents: ServiceDocumentRow[], serviceId: string) {
  for (const doc of documents) {
    if (!doc.document_id) continue
    const { data: remaining, error } = await serviceClient
      .from("document_links")
      .select("id")
      .eq("document_id", doc.document_id)
      .neq("entity_id", serviceId)
      .limit(1)
    if (error) {
      console.warn("[supabase] Failed to check remaining document links", { error })
      continue
    }
    if (remaining && remaining.length > 0) {
      continue
    }
    const document = Array.isArray(doc.document) ? doc.document[0] : doc.document
    const bucket = document?.bucket
    const path = document?.storage_path ?? document?.file_name
    if (bucket && path) {
      await serviceClient.storage.from(bucket).remove([path])
    }
    await serviceClient.from("documents").delete().eq("id", doc.document_id)
  }
}

function parseServiceUpdatePayload(body: unknown): { ok: true; value: ServiceUpdatePayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid payload" }
  }
  const raw = body as Record<string, unknown>
  const value: ServiceUpdatePayload = {}
  const type = normalizeType(raw.type)
  if (type) value.type = type
  const location = cleanString(raw.location)
  if (location) value.location = location
  const plannedStart = normalizeDate(raw.plannedStart)
  const plannedEnd = normalizeDate(raw.plannedEnd)
  if (plannedStart) value.plannedStart = plannedStart
  if (plannedEnd) value.plannedEnd = plannedEnd
  if (raw.notes !== undefined) {
    value.notes = cleanString(raw.notes) ?? ""
  }
  return { ok: true, value }
}

function normalizeType(value: unknown): ServiceUpdatePayload["type"] | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  return normalized === "maintenance" || normalized === "repair" ? (normalized as ServiceUpdatePayload["type"]) : null
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
