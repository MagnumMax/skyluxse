import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { timingSafeEqual } from "https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"

const MAX_BODY_BYTES = 1_048_576 // 1 MB safety limit per Kommo spec
const SIGNATURE_HEADER = "x-kommo-signature"
const FEATURE_FLAG_KEY = 'enableKommoLive'
const EXCLUDED_STATUS_IDS = new Set([79790631, 91703923, 143])
const KOMMO_VEHICLE_FIELD_ID = Deno.env.get("KOMMO_VEHICLE_FIELD_ID")
const KOMMO_VEHICLE_FIELD_CODE = Deno.env.get("KOMMO_VEHICLE_FIELD_CODE")?.toLowerCase()

type KommoPayload = Record<string, unknown>

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

async function isFeatureFlagEnabled(client: SupabaseClient, flag: string) {
  const { data } = await client
    .from('system_feature_flags')
    .select('is_enabled')
    .eq('flag', flag)
    .maybeSingle()

  return data?.is_enabled ?? false
}

async function isValidSignature(rawBody: string, headerValue: string | null) {
  const secret = Deno.env.get("KOMMO_WEBHOOK_SECRET")
  if (!secret || !headerValue) return false
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))
  const expected = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return timingSafeEqual(
    encoder.encode(expected),
    encoder.encode(headerValue.toLowerCase())
  )
}

function asString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : null
  }
  return null
}

function extractKommoVehicleId(payload: KommoPayload): string | null {
  const typedPayload = payload as {
    vehicle_id?: unknown
    vehicleId?: unknown
    vehicle?: { id?: unknown }
    custom_fields_values?: unknown
    custom_fields?: unknown
  }

  const direct =
    asString(typedPayload.vehicle_id) ||
    asString(typedPayload.vehicleId) ||
    asString(typedPayload.vehicle?.id)

  if (direct) return direct

  const maybeFields = typedPayload.custom_fields_values ?? typedPayload.custom_fields

  if (!Array.isArray(maybeFields)) return null

  for (const field of maybeFields) {
    if (!field || typeof field !== "object") continue
    const fieldIdMatches = KOMMO_VEHICLE_FIELD_ID
      ? String((field as { field_id?: string | number }).field_id ?? "") === KOMMO_VEHICLE_FIELD_ID
      : false
    const fieldCodeMatches = KOMMO_VEHICLE_FIELD_CODE
      ? ((field as { field_code?: string; code?: string }).field_code ?? (field as { code?: string }).code ?? "")
          .toLowerCase() === KOMMO_VEHICLE_FIELD_CODE
      : false

    if (!fieldIdMatches && !fieldCodeMatches) continue

    const values = (field as { values?: Array<{ value?: unknown; enum_code?: unknown; enum?: unknown }> }).values
    if (!Array.isArray(values)) continue
    for (const entry of values) {
      const candidate = asString(entry?.value ?? entry?.enum_code ?? entry?.enum)
      if (candidate) {
        return candidate
      }
    }
  }

  return null
}

function getStatusId(payload: KommoPayload): number | null {
  const raw = (payload as { status_id?: unknown }).status_id
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw
  }
  const str = asString(raw)
  if (!str) return null
  const parsed = Number(str)
  return Number.isFinite(parsed) ? parsed : null
}

function isExcludedStatus(payload: KommoPayload): boolean {
  const statusId = getStatusId(payload)
  return typeof statusId === "number" && EXCLUDED_STATUS_IDS.has(statusId)
}

async function findVehicleByKommoId(client: SupabaseClient, kommoVehicleId: string) {
  const { data, error } = await client
    .from('vehicles')
    .select('id, name, plate_number, kommo_vehicle_id')
    .eq('kommo_vehicle_id', kommoVehicleId)
    .maybeSingle()

  if (error) {
    console.error('Failed to lookup vehicle by Kommo ID', { kommoVehicleId, error })
    return null
  }

  return data
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0")
    if (contentLength > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413 })
    }

    const rawBody = await req.text()
    const signatureHeader = req.headers.get(SIGNATURE_HEADER)
    const signatureValid = await isValidSignature(rawBody, signatureHeader)
    if (!signatureValid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 })
    }

    const payload = JSON.parse(rawBody) as KommoPayload
    const supabase = getServiceClient()

    const sourcePayloadId: string = payload?.id?.toString?.() ?? crypto.randomUUID()

    const kommoVehicleId = extractKommoVehicleId(payload)
    const vehicleMatch = kommoVehicleId ? await findVehicleByKommoId(supabase, kommoVehicleId) : null
    const excludedStatus = isExcludedStatus(payload)

    const { error: logError } = await supabase.from("kommo_webhook_events").insert({
      source_payload_id: sourcePayloadId,
      payload,
      hmac_validated: true,
      status: excludedStatus ? "ignored_pending_status" : "received",
    })

    if (logError) {
      console.error("Failed to log Kommo payload", logError)
      return new Response(JSON.stringify({ error: "Unable to persist payload" }), { status: 500 })
    }

    if (excludedStatus) {
      console.info("Kommo webhook payload skipped due to excluded status", {
        sourcePayloadId,
        kommoVehicleId,
        vehicleMatched: Boolean(vehicleMatch),
        statusId: getStatusId(payload),
      })
      return new Response(
        JSON.stringify({
          status: "ignored_pending_status",
          reason: "Status not yet confirmed",
          payloadId: sourcePayloadId,
          kommoVehicleId,
          vehicleMatch,
        }),
        { status: 202 }
      )
    }

    const isLive = await isFeatureFlagEnabled(supabase, FEATURE_FLAG_KEY)

    if (!isLive) {
      console.info("Kommo webhook (stubbed) accepted", {
        sourcePayloadId,
        kommoVehicleId,
        vehicleMatched: Boolean(vehicleMatch),
      })
      return new Response(
        JSON.stringify({
          status: "accepted",
          mode: "stubbed",
          payloadId: sourcePayloadId,
          kommoVehicleId,
          vehicleMatch,
        }),
        { status: 202 }
      )
    }

    // TODO: replace stub with real booking + client/vehicle upsert.
    console.info("Kommo payload accepted for live ingestion", {
      sourcePayloadId,
      kommoVehicleId,
      vehicleMatch,
    })

    return new Response(
      JSON.stringify({
        status: "queued",
        payloadId: sourcePayloadId,
        kommoVehicleId,
        vehicleId: vehicleMatch?.id ?? null,
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error("import-kommo error", error)
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
  }
})
