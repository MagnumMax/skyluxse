import { NextResponse } from "next/server"

import { getVehicleServices } from "@/lib/data/fleet-data"
import { serviceClient } from "@/lib/supabase/service-client"

type RouteParams = { params: Promise<{ vehicleId: string; serviceId: string; documentId: string }> }

export async function DELETE(_: Request, { params }: RouteParams) {
  const { vehicleId, serviceId, documentId } = await params
  if (!vehicleId || !serviceId || !documentId) {
    return NextResponse.json({ error: "Vehicle ID, service ID, and document ID are required" }, { status: 400 })
  }

  const { data: documentRow, error: fetchError } = await serviceClient
    .from("documents")
    .select("id, bucket, storage_path, file_name")
    .eq("id", documentId)
    .maybeSingle()
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const { error: linkDeleteError } = await serviceClient
    .from("document_links")
    .delete()
    .eq("document_id", documentId)
    .eq("entity_id", serviceId)
    .eq("scope", "maintenance_job")

  if (linkDeleteError) {
    return NextResponse.json({ error: linkDeleteError.message }, { status: 500 })
  }

  const { data: remainingLinks, error: remainingError } = await serviceClient
    .from("document_links")
    .select("id")
    .eq("document_id", documentId)
    .limit(1)

  if (remainingError) {
    return NextResponse.json({ error: remainingError.message }, { status: 500 })
  }

  if (!remainingLinks || remainingLinks.length === 0) {
    await deleteStorageObject(documentRow)
    await serviceClient.from("documents").delete().eq("id", documentId)
  }

  const services = await getVehicleServices(vehicleId)
  return NextResponse.json({ services })
}

async function deleteStorageObject(documentRow: { bucket?: string | null; storage_path?: string | null; file_name?: string | null } | null) {
  const bucket = documentRow?.bucket
  const path = documentRow?.storage_path ?? documentRow?.file_name
  if (!bucket || !path) return
  await serviceClient.storage.from(bucket).remove([path])
}
