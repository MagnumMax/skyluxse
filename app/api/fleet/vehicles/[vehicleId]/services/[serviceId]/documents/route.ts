import { randomUUID } from "crypto"
import { NextResponse } from "next/server"

import { getVehicleServices } from "@/lib/data/fleet-data"
import { serviceClient } from "@/lib/supabase/service-client"

type RouteParams = { params: Promise<{ vehicleId: string; serviceId: string }> }

const SERVICE_BUCKET = "vehicle-documents"

export async function POST(request: Request, { params }: RouteParams) {
  const { vehicleId, serviceId } = await params
  if (!vehicleId || !serviceId) {
    return NextResponse.json({ error: "Vehicle ID and service ID are required" }, { status: 400 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 })
  }
  const docType = cleanString(formData.get("doc_type")) ?? "service"

  const { data: existing, error: fetchError } = await serviceClient
    .from("maintenance_jobs")
    .select("id")
    .eq("id", serviceId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle()
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 })
  }

  const storagePath = buildStoragePath(serviceId, file.name)
  const arrayBuffer = await file.arrayBuffer()
  const uploadResult = await serviceClient.storage
    .from(SERVICE_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type || "application/octet-stream", upsert: true })
  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const documentInsert = {
    bucket: SERVICE_BUCKET,
    storage_path: storagePath,
    file_name: storagePath.split("/").pop(),
    original_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    status: "needs_review",
    source: "Service upload",
    expires_at: null,
    metadata: {},
  }

  const { data: insertedDocument, error: insertError } = await serviceClient
    .from("documents")
    .insert(documentInsert)
    .select("id, bucket, storage_path, file_name")
    .single()
  if (insertError || !insertedDocument) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to save document" }, { status: 500 })
  }

  const { error: linkError } = await serviceClient.from("document_links").insert({
    document_id: insertedDocument.id,
    scope: "maintenance_job",
    entity_id: serviceId,
    doc_type: docType,
    metadata: null,
  })
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  const services = await getVehicleServices(vehicleId)
  return NextResponse.json({ service: services.find((entry) => entry.id === serviceId) ?? null, services })
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

function buildStoragePath(serviceId: string, originalName: string): string {
  const cleanName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const extension = cleanName.includes(".") ? cleanName.split(".").pop() : ""
  const baseName = cleanName.replace(/\.[^.]+$/, "")
  const uniqueName = `${baseName || "document"}-${randomUUID()}${extension ? `.${extension}` : ""}`
  return `services/${serviceId}/${uniqueName}`
}
