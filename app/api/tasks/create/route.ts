import { NextResponse } from "next/server"

import { serviceClient } from "@/lib/supabase/service-client"
import { sendTaskCreatedNotification } from "@/lib/notifications/task-notifications"

type Payload = { bookingId?: string; modes?: ("delivery" | "pickup")[] }

export async function POST(request: Request) {
  const body = await readJson(request)
  const bookingId = body.bookingId?.trim()
  const modes = Array.isArray(body.modes) && body.modes.length ? body.modes : ["delivery", "pickup"]
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 })
  }

  const { data: booking, error: bookingError } = await serviceClient
    .from("bookings")
    .select(
      "id, vehicle_id, client_id, driver_id, start_at, end_at, delivery_location, collect_location"
    )
    .eq("id", bookingId)
    .limit(1)
    .single()
  if (bookingError || !booking) {
    return NextResponse.json({ error: bookingError?.message ?? "Booking not found" }, { status: 404 })
  }

  const created: string[] = []
  for (const raw of modes) {
    const mode = normalizeMode(raw)
    if (!mode) continue
    const payload = buildTaskInsert(booking, mode)
    const exists = await serviceClient
      .from("tasks")
      .select("id")
      .eq("booking_id", payload.booking_id)
      .eq("task_type", payload.task_type)
      .in("status", ["todo", "inprogress"]) 
      .limit(1)
      .maybeSingle()
    if (exists.error && exists.error.code !== "PGRST116") {
      return NextResponse.json({ error: exists.error.message }, { status: 500 })
    }
    if (exists.data?.id) continue
    const { data, error } = await serviceClient
      .from("tasks")
      .insert(payload)
      .select("id")
      .single()
    if (error || !data?.id) {
      return NextResponse.json({ error: error?.message ?? "Failed to create task" }, { status: 500 })
    }
    created.push(data.id)
  }

  return NextResponse.json({ created })
}

async function readJson(request: Request): Promise<Payload> {
  try {
    const raw = await request.json()
    return typeof raw === "object" && raw ? (raw as Payload) : {}
  } catch {
    return {}
  }
}

function buildTaskInsert(row: any, mode: "delivery" | "pickup") {
  const deadline = mode === "delivery" ? row.start_at : row.end_at
  const geo =
    mode === "delivery"
      ? { pickup: row.collect_location ?? undefined, dropoff: row.delivery_location ?? undefined }
      : { pickup: row.delivery_location ?? undefined, dropoff: row.collect_location ?? undefined }
  const requiredInputs =
    mode === "delivery"
      ? [
          { key: "odo_before", label: "Odometer (before)", type: "number", required: true },
          { key: "fuel_before", label: "Fuel/charge level (before)", type: "select", required: true, options: ["Full", "3/4", "1/2", "1/4", "Empty"] },
          { key: "handover_photos", label: "Handover photos", type: "file", required: true, multiple: true },
          { key: "damage_notes", label: "Notes on condition/damages", type: "text", required: false },
        ]
      : [
          { key: "odo_after", label: "Odometer (after)", type: "number", required: true },
          { key: "fuel_after", label: "Fuel/charge level (after)", type: "select", required: true, options: ["Full", "3/4", "1/2", "1/4", "Empty"] },
          { key: "photos_return", label: "Return photos", type: "file", required: true, multiple: true },
          { key: "damage_notes", label: "Notes on condition/damages", type: "text", required: true },
        ]
  const checklist =
    mode === "delivery"
      ? [
          { id: "arrive", label: "Arrive and verify client identity", required: true, completed: false },
          { id: "photos-ext", label: "Exterior photos", required: true, completed: false },
          { id: "photos-int", label: "Interior photos", required: false, completed: false },
          { id: "odo-before", label: "Odometer (before)", required: true, completed: false },
          { id: "fuel-before", label: "Fuel/charge level (before)", required: true, completed: false },
          { id: "handover", label: "Handover keys and capture signature/code", required: true, completed: false },
        ]
      : [
          { id: "arrive", label: "Arrive and verify client identity", required: true, completed: false },
          { id: "photos-return-ext", label: "Exterior photos on return", required: true, completed: false },
          { id: "photos-return-int", label: "Interior photos on return", required: false, completed: false },
          { id: "odo-after", label: "Odometer (after)", required: true, completed: false },
          { id: "fuel-after", label: "Fuel/charge level (after)", required: true, completed: false },
          { id: "damage", label: "Mark damages/scratches", required: true, completed: false },
          { id: "keys", label: "Collect keys/equipment", required: true, completed: false },
        ]
  return {
    booking_id: row.id,
    vehicle_id: row.vehicle_id,
    client_id: row.client_id,
    task_type: mode,
    status: "todo",
    title: mode === "delivery" ? "Delivery" : "Pickup",
    deadline_at: deadline,
    assignee_driver_id: "07c91c85-62c8-44dd-8351-ef78826e633f", // Force assignment to driver@skyluxse.ae
    sla_minutes: 0,
    metadata: {
      scope: "driver",
      priority: mode === "delivery" ? "high" : "medium",
      description: mode === "delivery" ? "Доставка авто клиенту" : "Забрать авто после аренды и зафиксировать состояние",
      category: "logistics",
      channel: "Auto",
      geo,
      checklist,
      requiredInputs,
    },
  }
}

function normalizeMode(value: unknown): "delivery" | "pickup" | null {
  if (typeof value !== "string") return null
  const v = value.trim().toLowerCase()
  return v === "delivery" || v === "pickup" ? (v as "delivery" | "pickup") : null
}
