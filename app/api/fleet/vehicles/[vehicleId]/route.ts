import { NextResponse } from "next/server"

import { mapVehicleFormToDb, vehicleFormSchema } from "@/lib/fleet/vehicle-form-schema"
import { serviceClient } from "@/lib/supabase/service-client"

type RouteParams = { params: Promise<{ vehicleId: string }> }

export async function PATCH(request: Request, { params }: RouteParams) {
  const { vehicleId } = await params
  if (!vehicleId) {
    return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 })
  }

  const body = await safeJson(request)
  const parsed = vehicleFormSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
  }

  const payload = mapVehicleFormToDb(parsed.data)
  const { error } = await serviceClient.from("vehicles").update(payload).eq("id", vehicleId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: vehicleId })
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
