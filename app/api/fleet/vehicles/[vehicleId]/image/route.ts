import { NextResponse } from "next/server"

import { serviceClient } from "@/lib/supabase/service-client"

type RouteParams = { params: Promise<{ vehicleId: string }> }

export async function PATCH(request: Request, { params }: RouteParams) {
  const { vehicleId } = await params
  if (!vehicleId) {
    return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 })
  }

  const body = await safeJson(request)
  const storagePath = typeof body?.storagePath === "string" ? body.storagePath.trim() : ""
  const bucket = typeof body?.bucket === "string" ? body.bucket.trim() : ""
  if (!storagePath || !bucket) {
    return NextResponse.json({ error: "bucket and storagePath are required" }, { status: 400 })
  }

  const combined = `${bucket}/${storagePath.replace(/^\/+/, "")}`

  const { error } = await serviceClient.from("vehicles").update({ image_url: combined }).eq("id", vehicleId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

async function safeJson(request: Request): Promise<any> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
