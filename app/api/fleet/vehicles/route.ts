import { NextResponse } from "next/server"

import { mapVehicleFormToDb, vehicleFormSchema } from "@/lib/fleet/vehicle-form-schema"
import { serviceClient } from "@/lib/supabase/service-client"

export async function POST(request: Request) {
  const body = await safeJson(request)
  const parsed = vehicleFormSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
  }

  const payload = mapVehicleFormToDb(parsed.data)
  const { data, error } = await serviceClient.from("vehicles").insert(payload).select("id").single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create vehicle" }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function formatZodError(error: { issues: Array<{ message: string }> }): string {
  const messages = error.issues.map((issue) => issue.message).filter(Boolean)
  return messages.join(", ") || "Invalid payload"
}
