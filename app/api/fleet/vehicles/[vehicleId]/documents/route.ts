import { randomUUID } from "crypto"
import { NextResponse } from "next/server"

import { VehicleDocument } from "@/lib/domain/entities"
import { createSignedUrl } from "@/lib/storage/signed-url"
import { serviceClient } from "@/lib/supabase/service-client"

const VEHICLE_DOCUMENT_BUCKET = "vehicle-documents"
const VEHICLE_DOCUMENT_TYPES = ["insurance", "mulkiya", "registration", "gallery", "other"] as const
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

type RouteParams = { params: Promise<{ vehicleId: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  const { vehicleId } = await params
  if (!vehicleId) {
    return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 10 MB)" }, { status: 400 })
  }

  const docTypeRaw = (formData.get("doc_type") as string | null) ?? "other"
  const docType = normalizeDocType(docTypeRaw)
  if (!docType) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 })
  }

  const name = file.name

  const storagePath = buildStoragePath(vehicleId, file.name)
  const arrayBuffer = await file.arrayBuffer()
  const uploadResult = await serviceClient.storage
    .from(VEHICLE_DOCUMENT_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type || "application/octet-stream", upsert: true })

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const documentInsert = {
    bucket: VEHICLE_DOCUMENT_BUCKET,
    storage_path: storagePath,
    file_name: storagePath.split("/").pop(),
    original_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    status: "needs_review",
    source: "Vehicle upload",
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

  const linkInsert = {
    document_id: insertedDocument.id,
    scope: "vehicle",
    entity_id: vehicleId,
    doc_type: docType,
    metadata: null,
  }

  const { error: linkError } = await serviceClient.from("document_links").insert(linkInsert)
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  const signedUrl = await createSignedUrl(insertedDocument.bucket, insertedDocument.storage_path ?? insertedDocument.file_name)
  const responseDocument: VehicleDocument = {
    id: insertedDocument.id,
    type: docType,
    name,
    status: "needs_review",
    expiry: undefined,
    url: signedUrl ?? undefined,
    notes: undefined,
    bucket: insertedDocument.bucket ?? undefined,
    storagePath: insertedDocument.storage_path ?? insertedDocument.file_name ?? undefined,
  }

  return NextResponse.json({ document: responseDocument })
}

function cleanString(input: FormDataEntryValue | null): string | undefined {
  if (typeof input !== "string") return undefined
  const trimmed = input.trim()
  return trimmed.length ? trimmed : undefined
}

function normalizeDocType(value: string): (typeof VEHICLE_DOCUMENT_TYPES)[number] | null {
  const normalized = value.toLowerCase()
  return VEHICLE_DOCUMENT_TYPES.includes(normalized as (typeof VEHICLE_DOCUMENT_TYPES)[number])
    ? (normalized as (typeof VEHICLE_DOCUMENT_TYPES)[number])
    : null
}

function buildStoragePath(vehicleId: string, originalName: string): string {
  const cleanName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const extension = cleanName.includes(".") ? cleanName.split(".").pop() : ""
  const baseName = cleanName.replace(/\.[^.]+$/, "")
  const uniqueName = `${baseName || "document"}-${randomUUID()}${extension ? `.${extension}` : ""}`
  return `${vehicleId}/${uniqueName}`
}
