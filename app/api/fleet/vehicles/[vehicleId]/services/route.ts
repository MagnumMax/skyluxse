import { NextResponse } from "next/server"

import { getVehicleServices } from "@/lib/data/fleet-data"
import { serviceClient } from "@/lib/supabase/service-client"

type RouteParams = { params: Promise<{ vehicleId: string }> }

type ServicePayload = {
  type: "maintenance" | "repair"
  location: string
  plannedStart: string
  plannedEnd: string
  notes?: string
}

export async function GET(_: Request, { params }: RouteParams) {
  const { vehicleId } = await params
  if (!vehicleId) {
    return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 })
  }

  const services = await getVehicleServices(vehicleId)
  return NextResponse.json({ services })
}

export async function POST(request: Request, { params }: RouteParams) {
  const { vehicleId } = await params
  if (!vehicleId) {
    return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 })
  }

  const body = await safeJson(request)
  const parsed = parseServicePayload(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { type, location, plannedStart, plannedEnd, notes } = parsed.value
  const insertPayload = {
    vehicle_id: vehicleId,
    job_type: type,
    status: "scheduled",
    scheduled_start: plannedStart,
    scheduled_end: plannedEnd,
    description: notes ?? null,
    location,
  }

  const { data, error } = await serviceClient.from("maintenance_jobs").insert(insertPayload).select("id").single()
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create service" }, { status: 500 })
  }

  const services = await getVehicleServices(vehicleId)
  return NextResponse.json({ service: services.find((entry) => entry.id === data.id) ?? null, services })
}

function parseServicePayload(body: unknown): { ok: true; value: ServicePayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid payload" }
  }
  const raw = body as Record<string, unknown>
  const type = normalizeType(raw.type)
  if (!type) {
    return { ok: false, error: "Invalid service type" }
  }
  const location = cleanString(raw.location)
  if (!location) {
    return { ok: false, error: "Location is required" }
  }
  const plannedStart = normalizeDate(raw.plannedStart)
  const plannedEnd = normalizeDate(raw.plannedEnd)
  if (!plannedStart || !plannedEnd) {
    return { ok: false, error: "Planned start and end are required" }
  }
  if (new Date(plannedStart).getTime() > new Date(plannedEnd).getTime()) {
    return { ok: false, error: "Planned start must be before end" }
  }
  const notes = cleanString(raw.notes)
  return { ok: true, value: { type, location, plannedStart, plannedEnd, notes } }
}

function normalizeType(value: unknown): ServicePayload["type"] | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  return normalized === "maintenance" || normalized === "repair" ? (normalized as ServicePayload["type"]) : null
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
