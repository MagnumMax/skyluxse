import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { timingSafeEqual } from "https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"

const SIGNATURE_HEADER = "x-kommo-signature"
const FEATURE_FLAG_KEY = "enableKommoLive"
const KOMMO_BASE_URL = Deno.env.get("KOMMO_BASE_URL") ?? ""
const KOMMO_ACCESS_TOKEN = Deno.env.get("KOMMO_ACCESS_TOKEN") ?? ""
const KOMMO_WEBHOOK_SECRET = Deno.env.get("KOMMO_WEBHOOK_SECRET") ?? ""

const KOMMO_STATUS_CONFIG: Record<
  string,
  { label: string; bookingStatus: "lead" | "confirmed" | "delivery" | "in_progress" | "completed" | "cancelled" }
> = {
  "75440391": { label: "Confirmed bookings", bookingStatus: "confirmed" },
  "75440395": { label: "Delivery within 24 hours", bookingStatus: "delivery" },
  "75440399": { label: "Car with customers", bookingStatus: "in_progress" },
}

function requireEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name} env var`)
  return value
}

function getServiceClient() {
  const supabaseUrl = requireEnv("SUPABASE_URL")
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

async function isFeatureFlagEnabled(client: SupabaseClient, flag: string) {
  const { data } = await client
    .from("system_feature_flags")
    .select("is_enabled")
    .eq("flag", flag)
    .maybeSingle()
  return data?.is_enabled ?? false
}

async function isValidSignature(rawBody: string, headerValue: string | null) {
  if (!KOMMO_WEBHOOK_SECRET || !headerValue) return false
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(KOMMO_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))
  const expected = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return timingSafeEqual(encoder.encode(expected), encoder.encode(headerValue.toLowerCase()))
}

async function kommoGet(path: string) {
  const url = `${KOMMO_BASE_URL}${path}`
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  })
  if (!resp.ok) {
    throw new Error(`Kommo request failed (${resp.status}): ${await resp.text()}`)
  }
  return resp.json()
}

function extractFieldValue(contact: any, code: string) {
  if (!contact?.custom_fields_values) return null
  const field = contact.custom_fields_values.find((f: any) => (f.code ?? f.field_code) === code)
  return field?.values?.[0]?.value ?? null
}

function mapBookingStatus(statusId: string) {
  return KOMMO_STATUS_CONFIG[statusId]?.bookingStatus ?? "lead"
}

function mapPipelineStage(pipelineId: string, statusId: string) {
  const map: Record<string, Record<string, string>> = {
    "9815931": {
      "75440391": "skyluxse_confirmed",
      "79790631": "skyluxse_bot_answering",
      "75440395": "skyluxse_delivery_24h",
      "75440399": "skyluxse_with_customer",
    },
  }
  return map[pipelineId]?.[statusId] ?? null
}

function leadSourcePayloadId(leadId: number | string) {
  return `kommo:${leadId}`
}

async function upsertClient(client: SupabaseClient, contact: any, fallbackName: string) {
  const kommoContactId = contact?.id ? String(contact.id) : null
  const payload = {
    kommo_contact_id: kommoContactId,
    name: contact?.name ?? fallbackName ?? "Komмо contact",
    phone: extractFieldValue(contact, "PHONE"),
    email: extractFieldValue(contact, "EMAIL"),
  }

  const { data, error } = await client
    .from("clients")
    .upsert(payload, { onConflict: "kommo_contact_id" })
    .select("id")
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}

async function upsertSalesLead(
  client: SupabaseClient,
  lead: any,
  clientId: string | null,
  stageId: string | null
) {
  const leadCode = leadSourcePayloadId(lead.id)
  const payload: Record<string, any> = {
    lead_code: leadCode,
    client_id: clientId,
    value_amount: lead.price ?? 0,
    updated_at: new Date().toISOString(),
  }
  if (stageId) payload.stage_id = stageId

  const { data, error } = await client
    .from("sales_leads")
    .upsert(payload, { onConflict: "lead_code" })
    .select("id")
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}

async function upsertBooking(
  client: SupabaseClient,
  lead: any,
  clientId: string | null,
  bookingStatus: string
) {
  const sourcePayloadId = leadSourcePayloadId(lead.id)
  const { data: existing, error: fetchError } = await client
    .from("bookings")
    .select("id")
    .eq("source_payload_id", sourcePayloadId)
    .maybeSingle()

  if (fetchError) throw fetchError

  const payload = {
    channel: "Kommo",
    source_payload_id: sourcePayloadId,
    client_id: clientId,
    status: bookingStatus,
    total_amount: lead.price ?? 0,
    external_code: `K-${lead.id}`,
  }

  if (existing) {
    const { error } = await client
      .from("bookings")
      .update(payload)
      .eq("id", existing.id)
    if (error) throw error
    return existing.id
  } else {
    const insertPayload = {
      ...payload,
      booking_type: "rental",
      priority: "medium",
    }
    const { data, error } = await client
      .from("bookings")
      .insert(insertPayload)
      .select("id")
      .single()
    if (error) throw error
    return data.id
  }
}

async function logBookingTimelineEvent(
  client: SupabaseClient,
  bookingId: string,
  statusId: string,
  label: string,
  pipelineId: string | number
) {
  const { error } = await client.from("booking_timeline_events").insert({
    booking_id: bookingId,
    event_type: "kommo_status_sync",
    message: `Kommo stage updated: ${label}`,
    payload: {
      status_id: statusId,
      stage_label: label,
      pipeline_id: pipelineId,
    },
  })
  if (error) throw error
}

type HandleResult = {
  leadId: number | string
  processed?: boolean
  skipped?: boolean
  statusId: string | null
  statusLabel: string | null
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

async function handleStatusChange(client: SupabaseClient, event: any): Promise<HandleResult> {
  const statusId = String(event.status_id ?? "")
  const config = KOMMO_STATUS_CONFIG[statusId]
  if (!config) {
    return { leadId: event.id, skipped: true, statusId, statusLabel: null }
  }

  const lead = await kommoGet(`/api/v4/leads/${event.id}?with=contacts,custom_fields`)
  const contactId = lead?._embedded?.contacts?.find((c: any) => c.is_main)?.id ?? lead?._embedded?.contacts?.[0]?.id
  const contact = contactId ? await kommoGet(`/api/v4/contacts/${contactId}?with=custom_fields`) : null

  const clientId = await upsertClient(client, contact, lead.name ?? `Lead ${event.id}`)
  const stageId = mapPipelineStage(String(event.pipeline_id), String(event.status_id))
  await upsertSalesLead(client, lead, clientId, stageId)
  const bookingStatus = mapBookingStatus(statusId)
  const bookingId = await upsertBooking(client, lead, clientId, bookingStatus)
  if (bookingId) {
    await logBookingTimelineEvent(client, bookingId, statusId, config.label, event.pipeline_id)
  }

  return { leadId: event.id, processed: true, statusId, statusLabel: config.label }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get(SIGNATURE_HEADER)
  if (!(await isValidSignature(rawBody, signature))) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const supabase = getServiceClient()

  const live = await isFeatureFlagEnabled(supabase, FEATURE_FLAG_KEY)
  if (!live) {
    return new Response(JSON.stringify({ error: "Kommo integration disabled" }), { status: 403 })
  }

  const statusEvents = payload?.leads?.status ?? []
  const results = []
  for (const event of statusEvents) {
    try {
      const result = await handleStatusChange(supabase, event)
      await supabase.from("kommo_webhook_events").insert({
        source_payload_id: String(event.id),
        payload,
        hmac_validated: true,
        status: result?.skipped ? "skipped" : "processed",
        kommo_status_id: result?.statusId ?? String(event.status_id ?? ""),
        kommo_status_label: result?.statusLabel ?? null,
      })
      results.push(result)
    } catch (error) {
      const errorMessage = formatError(error)
      console.error("Failed to process status event", errorMessage, error)
      await supabase.from("kommo_webhook_events").insert({
        source_payload_id: String(event.id),
        payload,
        hmac_validated: true,
        status: "failed",
        kommo_status_id: String(event.status_id ?? ""),
        kommo_status_label: KOMMO_STATUS_CONFIG[String(event.status_id ?? "")]?.label ?? null,
        error_message: errorMessage
      })
      results.push({ leadId: event.id, error: errorMessage })
    }
  }

  return new Response(JSON.stringify({ processed: results }), { status: 200 })
})
