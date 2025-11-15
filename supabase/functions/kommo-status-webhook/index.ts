import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { timingSafeEqual } from "https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import { computeBookingTotals } from "../../../lib/pricing/booking-totals.ts"

const SIGNATURE_HEADER = "x-kommo-signature"
const REQUIRE_SIGNATURE = false
const KOMMO_BASE_URL = Deno.env.get("KOMMO_BASE_URL") ?? ""
const KOMMO_ACCESS_TOKEN = Deno.env.get("KOMMO_ACCESS_TOKEN") ?? ""
const KOMMO_WEBHOOK_SECRET = Deno.env.get("KOMMO_WEBHOOK_SECRET") ?? ""
const DOCUMENTS_BUCKET =
  Deno.env.get("SUPABASE_STORAGE_DOCUMENTS_BUCKET") ?? Deno.env.get("STORAGE_DOCUMENTS_BUCKET") ?? ""
const KOMMO_VEHICLE_FIELD_ID = Deno.env.get("KOMMO_VEHICLE_FIELD_ID") ?? "1234163"
const KOMMO_VEHICLE_FIELD_CODE = Deno.env.get("KOMMO_VEHICLE_FIELD_CODE")?.toLowerCase()
const KOMMO_DELIVERY_FIELD_ID = Number(Deno.env.get("KOMMO_DELIVERY_FIELD_ID") ?? "1218176")
const KOMMO_COLLECT_FIELD_ID = Number(Deno.env.get("KOMMO_COLLECT_FIELD_ID") ?? "1218178")

const KOMMO_FIELD_IDS = {
  deliveryLocation: 1218182,
  collectLocation: 1234165,
  deliveryFee: 1234177,
  durationDays: 1234173,
  priceDaily: 1232960,
  insuranceFee: 1234175,
  fullInsuranceFee: 1234179,
  advancePayment: 1233272,
  salesOrderUrl: 1224030,
  agreementNumber: 806190,
}

const DOCUMENT_FIELD_MAP = [
  { fieldId: 1234167, docType: "passport_id" },
  { fieldId: 1234169, docType: "driver_license" },
  { fieldId: 1234171, docType: "emirates_id" },
]

const KOMMO_MAX_RETRIES = Math.max(1, Math.floor(coerceEnvNumber(Deno.env.get("KOMMO_MAX_RETRIES"), 4)))
const KOMMO_RETRY_BASE_DELAY_MS = Math.max(
  100,
  Math.floor(coerceEnvNumber(Deno.env.get("KOMMO_RETRY_BASE_DELAY_MS"), 500))
)
const KOMMO_RETRY_MAX_DELAY_MS = Math.max(
  KOMMO_RETRY_BASE_DELAY_MS,
  Math.floor(coerceEnvNumber(Deno.env.get("KOMMO_RETRY_MAX_DELAY_MS"), 5000))
)

const KOMMO_STATUS_CONFIG = {
  "75440383": { label: "Incoming Leads", bookingStatus: "lead" },
  "79790631": { label: "Request Bot Answering", bookingStatus: "lead" },
  "91703923": { label: "Follow Up", bookingStatus: "lead" },
  "96150292": { label: "Waiting for Payment", bookingStatus: "confirmed" },
  "75440391": { label: "Confirmed Bookings", bookingStatus: "confirmed" },
  "75440395": { label: "Delivery Within 24 Hours", bookingStatus: "delivery" },
  "75440399": { label: "Car with Customers", bookingStatus: "in_progress" },
  "76475495": { label: "Pick Up Within 24 Hours", bookingStatus: "in_progress" },
  "78486287": { label: "Objections", bookingStatus: "lead" },
  "75440643": { label: "Refund Deposit", bookingStatus: "completed" },
  "75440639": { label: "Deal Is Closed", bookingStatus: "completed" },
  "142": { label: "Closed · Won", bookingStatus: "completed" },
  "143": { label: "Closed · Lost", bookingStatus: "cancelled" },
}

const COUNTRY_MAP = {
  uae: "AE",
  "united arab emirates": "AE",
  emirates: "AE",
  dubai: "AE",
  russia: "RU",
  "russian federation": "RU",
  russian: "RU",
  ukraine: "UA",
  kazakhstan: "KZ",
  belarus: "BY",
  india: "IN",
  pakistan: "PK",
  "saudi arabia": "SA",
  ksa: "SA",
  qatar: "QA",
  kuwait: "KW",
  oman: "OM",
  bahrain: "BH",
  usa: "US",
  "united states": "US",
  "united states of america": "US",
}

function coerceEnvNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
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

type SignatureValidation = {
  ok: boolean
  expected?: string
  provided?: string | null
  reason?: string
}

async function validateSignature(rawBody: string, headerValue: string | null): Promise<SignatureValidation> {
  if (!REQUIRE_SIGNATURE) return { ok: true }
  if (!KOMMO_WEBHOOK_SECRET) return { ok: false, reason: "missing_secret", provided: headerValue }
  if (!headerValue) return { ok: false, reason: "missing_header", provided: null }
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
  const expectedBytes = encoder.encode(expected)
  const providedBytes = encoder.encode(headerValue.toLowerCase())
  if (expectedBytes.length !== providedBytes.length) {
    return { ok: false, expected, provided: headerValue, reason: "length_mismatch" }
  }
  const valid = timingSafeEqual(expectedBytes, providedBytes)
  return { ok: valid, expected, provided: headerValue, reason: valid ? undefined : "mismatch" }
}

function shouldRetryKommo(status: number) {
  return status === 429 || (status >= 500 && status < 600)
}

function parseRetryAfterMs(resp: Response) {
  const value = resp.headers.get("Retry-After")
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000)
  }
  const absoluteTs = Date.parse(value)
  if (!Number.isNaN(absoluteTs)) {
    return Math.max(absoluteTs - Date.now(), 0)
  }
  return null
}

function computeKommoRetryDelay(resp: Response, attempt: number) {
  const retryAfter = parseRetryAfterMs(resp)
  const exponential = Math.min(
    KOMMO_RETRY_MAX_DELAY_MS,
    KOMMO_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1)
  )
  const baseDelay = retryAfter ?? exponential
  const jitter = Math.random() * 250
  return Math.max(100, baseDelay + jitter)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function kommoGet(path: string, attempt = 1) {
  const url = `${KOMMO_BASE_URL}${path}`
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  })
  if (!resp.ok) {
    if (shouldRetryKommo(resp.status) && attempt < KOMMO_MAX_RETRIES) {
      const delayMs = computeKommoRetryDelay(resp, attempt)
      console.warn("Kommo request throttled, retrying", {
        path,
        status: resp.status,
        attempt,
        delayMs,
      })
      await sleep(delayMs)
      return kommoGet(path, attempt + 1)
    }
    throw new Error(`Kommo request failed (${resp.status}): ${await resp.text()}`)
  }
  return resp.json()
}

function extractFieldValue(contact: any, code: string) {
  if (!contact?.custom_fields_values) return null
  const field = contact.custom_fields_values.find((f: any) => (f.code ?? f.field_code) === code)
  return field?.values?.[0]?.value ?? null
}

function extractFieldByName(contact: any, name: string) {
  if (!contact?.custom_fields_values) return null
  const target = name.toLowerCase()
  const field = contact.custom_fields_values.find((f: any) => {
    const label = (f.name ?? f.field_name ?? f.code ?? "").toLowerCase()
    return label === target
  })
  return field?.values?.[0]?.value ?? null
}

function normalizeCountryLabel(value: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }
  const lower = trimmed.toLowerCase()
  if (COUNTRY_MAP[lower]) {
    return COUNTRY_MAP[lower]
  }
  return trimmed
}

function normalizeGenderLabel(value: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  if (["male", "m", "man"].includes(lower)) return "Male"
  if (["female", "f", "woman"].includes(lower)) return "Female"
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function getCustomFields(entity: any) {
  return Array.isArray(entity?.custom_fields_values) ? entity.custom_fields_values : []
}

function findCustomField(entity: any, fieldId: number) {
  return getCustomFields(entity).find((field: any) => Number(field?.field_id ?? 0) === fieldId)
}

function extractStringField(entity: any, fieldId: number) {
  const field = findCustomField(entity, fieldId)
  if (!field || !Array.isArray(field.values) || !field.values.length) return null
  const entry = field.values[0]
  if (entry?.value === null || entry?.value === undefined) {
    if (entry?.enum_code) return String(entry.enum_code)
    if (entry?.enum_id !== undefined) return String(entry.enum_id)
    return null
  }
  if (typeof entry.value === "object") {
    return null
  }
  return String(entry.value)
}

function extractNumericField(entity: any, fieldId: number) {
  const raw = extractStringField(entity, fieldId)
  if (!raw) return null
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : null
}

function extractIntegerField(entity: any, fieldId: number) {
  const raw = extractStringField(entity, fieldId)
  if (!raw) return null
  const parsed = parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function mapBookingStatus(statusId: string) {
  return KOMMO_STATUS_CONFIG[statusId]?.bookingStatus ?? "lead"
}

function resolveKommoStatusLabel(statusId: string | null) {
  const normalized = statusId && statusId.length ? statusId : "unknown"
  return KOMMO_STATUS_CONFIG[normalized]?.label ?? `Kommo status ${normalized}`
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
  const phone = extractFieldValue(contact, "PHONE")
  const email = extractFieldValue(contact, "EMAIL")
  const nationality = normalizeCountryLabel(extractFieldByName(contact, "Nationality"))
  const gender = normalizeGenderLabel(extractFieldByName(contact, "Gender"))

  const payload: Record<string, any> = {
    kommo_contact_id: kommoContactId,
    name: contact?.name ?? fallbackName ?? "Komмо contact",
  }

  if (phone) payload.phone = phone
  if (email) payload.email = email
  if (nationality) payload.residency_country = nationality
  if (gender) payload.gender = gender

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
  bookingStatus: string,
  options: BookingOptions = {}
) {
  const sourcePayloadId = leadSourcePayloadId(lead.id)
  const { data: existing, error: fetchError } = await client
    .from("bookings")
    .select("id")
    .eq("source_payload_id", sourcePayloadId)
    .maybeSingle()

  if (fetchError) throw fetchError

  const payload: Record<string, any> = {
    channel: "Kommo",
    source_payload_id: sourcePayloadId,
    client_id: clientId,
    status: bookingStatus,
    external_code: `K-${lead.id}`,
    kommo_status_id: lead?.status_id ? Number(lead.status_id) : null,
  }

  if (options.vehicleId !== undefined) payload.vehicle_id = options.vehicleId
  if (options.startAt !== undefined) payload.start_at = options.startAt
  if (options.endAt !== undefined) payload.end_at = options.endAt ?? options.startAt ?? null
  if (options.deliveryFeeLabel !== undefined) payload.delivery_fee_label = options.deliveryFeeLabel
  if (options.deliveryLocation !== undefined) payload.delivery_location = options.deliveryLocation
  if (options.collectLocation !== undefined) payload.collect_location = options.collectLocation
  if (options.rentalDurationDays !== undefined) payload.rental_duration_days = options.rentalDurationDays
  if (options.priceDaily !== undefined) payload.price_daily = options.priceDaily
  if (options.insuranceFeeLabel !== undefined) payload.insurance_fee_label = options.insuranceFeeLabel
  if (options.fullInsuranceFee !== undefined) payload.full_insurance_fee = options.fullInsuranceFee
  if (options.advancePayment !== undefined) payload.advance_payment = options.advancePayment
  if (options.salesOrderUrl !== undefined) payload.sales_order_url = options.salesOrderUrl
  if (options.agreementNumber !== undefined) payload.agreement_number = options.agreementNumber

  const computedTotals = computeBookingTotals({
    dailyRate: options.priceDaily,
    durationDays: options.rentalDurationDays,
    deliveryFeeLabel: options.deliveryFeeLabel,
    insuranceFeeLabel: options.insuranceFeeLabel,
    insuranceFeeAmount: options.fullInsuranceFee,
    depositOptionLabel: options.insuranceFeeLabel,
  })
  payload.total_amount = computedTotals?.total ?? 0

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

function asString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString()
  }
  return null
}

function extractKommoVehicleId(entity: any): string | null {
  const direct =
    asString(entity?.vehicle_id) ||
    asString(entity?.vehicleId) ||
    asString(entity?.vehicle?.id)
  if (direct) return direct

  const fields = Array.isArray(entity?.custom_fields_values) ? entity.custom_fields_values : []
  for (const field of fields) {
    if (!field || typeof field !== "object") continue
    const fieldIdMatches = KOMMO_VEHICLE_FIELD_ID
      ? String(field?.field_id ?? "") === KOMMO_VEHICLE_FIELD_ID
      : false
    const fieldCodeMatches = KOMMO_VEHICLE_FIELD_CODE
      ? String(field?.field_code ?? field?.code ?? "").toLowerCase() === KOMMO_VEHICLE_FIELD_CODE
      : false
    if (!fieldIdMatches && !fieldCodeMatches) continue
    const values = Array.isArray(field?.values) ? field.values : []
    for (const entry of values) {
      const candidate = asString(entry?.enum_id ?? entry?.value ?? entry?.enum_code ?? entry?.enum)
      if (candidate) return candidate
    }
  }
  return null
}

async function findVehicleByKommoId(client: SupabaseClient, kommoVehicleId: string) {
  const { data, error } = await client
    .from("vehicles")
    .select("id, kommo_vehicle_id")
    .eq("kommo_vehicle_id", kommoVehicleId)
    .maybeSingle()
  if (error) {
    console.error("Failed to lookup vehicle by Kommo ID", { kommoVehicleId, error })
    return null
  }
  return data
}

function extractKommoEpoch(lead: any, fieldId: number): string | null {
  if (!fieldId) return null
  const fields = Array.isArray(lead?.custom_fields_values) ? lead.custom_fields_values : []
  for (const field of fields) {
    if (Number(field?.field_id ?? 0) !== fieldId) continue
    const values = Array.isArray(field?.values) ? field.values : []
    for (const entry of values) {
      const raw = asString(entry?.value ?? entry?.enum_code ?? entry?.enum)
      if (!raw) continue
      const numeric = Number(raw)
      if (Number.isFinite(numeric)) {
        return new Date(numeric * 1000).toISOString()
      }
      const parsed = Date.parse(raw)
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString()
      }
    }
  }
  return null
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

type PathToken = string | number

type BookingOptions = {
  vehicleId?: string | null
  startAt?: string | null
  endAt?: string | null
  deliveryFeeLabel?: string | null
  deliveryLocation?: string | null
  collectLocation?: string | null
  rentalDurationDays?: number | null
  priceDaily?: number | null
  insuranceFeeLabel?: string | null
  fullInsuranceFee?: number | null
  advancePayment?: number | null
  salesOrderUrl?: string | null
  agreementNumber?: string | null
}

function parseFormEncodedPayload(rawBody: string) {
  const params = new URLSearchParams(rawBody)
  const result: Record<string, any> = {}

  const tokenize = (key: string): PathToken[] => {
    const tokens: PathToken[] = []
    key.replace(/([^\[\]]+)|\[(.*?)\]/g, (_, head, bracket) => {
      const token = head ?? bracket ?? ""
      if (token === "") return ""
      const numeric = Number(token)
      tokens.push(Number.isInteger(numeric) && String(numeric) === token ? numeric : token)
      return ""
    })
    return tokens
  }

  const assignValue = (target: any, tokens: PathToken[], value: string) => {
    let current = target
    tokens.forEach((token, index) => {
      const isLast = index === tokens.length - 1
      const nextToken = tokens[index + 1]

      if (isLast) {
        if (typeof token === "number") {
          if (!Array.isArray(current)) {
            throw new Error("Unexpected array index for non-array container")
          }
          current[token] = value
        } else {
          current[token] = value
        }
        return
      }

      if (typeof token === "number") {
        if (!Array.isArray(current)) {
          throw new Error("Unexpected array index for non-array container")
        }
        if (current[token] === undefined) current[token] = typeof nextToken === "number" ? [] : {}
        current = current[token]
      } else {
        if (current[token] === undefined) current[token] = typeof nextToken === "number" ? [] : {}
        current = current[token]
      }
    })
  }

  for (const [key, value] of params.entries()) {
    const tokens = tokenize(key)
    if (!tokens.length) continue
    assignValue(result, tokens, value)
  }

  return result
}

async function handleStatusChange(client: SupabaseClient, event: any): Promise<HandleResult> {
  const statusId = String(event.status_id ?? "")
  const statusLabel = resolveKommoStatusLabel(statusId)

  const lead = await kommoGet(`/api/v4/leads/${event.id}?with=contacts,custom_fields`)
  const contactId = lead?._embedded?.contacts?.find((c: any) => c.is_main)?.id ?? lead?._embedded?.contacts?.[0]?.id
  const contact = contactId ? await kommoGet(`/api/v4/contacts/${contactId}?with=custom_fields`) : null

  const clientId = await upsertClient(client, contact, lead.name ?? `Lead ${event.id}`)
  if (clientId) {
    await syncClientDocuments(client, contact, clientId, lead).catch((error) =>
      console.error("Failed to sync Kommo documents", error)
    )
  }
  const stageId =
    mapPipelineStage(String(event.pipeline_id), String(event.status_id)) ?? String(event.status_id ?? "")
  await upsertSalesLead(client, lead, clientId, stageId)
  const bookingStatus = mapBookingStatus(statusId)
  const kommoVehicleId = extractKommoVehicleId(lead)
  let vehicleMatch: { id: string } | null = null
  if (kommoVehicleId) {
    vehicleMatch = await findVehicleByKommoId(client, kommoVehicleId)
    if (!vehicleMatch) {
      console.warn("Vehicle from Kommo not found in Supabase", { kommoVehicleId })
    }
  }

  const startAt =
    extractKommoEpoch(lead, KOMMO_DELIVERY_FIELD_ID) ?? extractKommoEpoch(lead, KOMMO_COLLECT_FIELD_ID)
  const endAt = extractKommoEpoch(lead, KOMMO_COLLECT_FIELD_ID) ?? startAt ?? null

  const bookingId = await upsertBooking(
    client,
    lead,
    clientId,
    bookingStatus,
    buildBookingOptions(lead, {
      vehicleId: vehicleMatch?.id ?? null,
      startAt: startAt ?? null,
      endAt: endAt ?? null,
    })
  )
  if (bookingId) {
    await logBookingTimelineEvent(client, bookingId, statusId, statusLabel, event.pipeline_id)
  }

  return { leadId: event.id, processed: true, statusId, statusLabel }
}

function buildBookingOptions(
  lead: any,
  base: { vehicleId?: string | null; startAt?: string | null; endAt?: string | null }
): BookingOptions {
  return {
    vehicleId: base.vehicleId ?? null,
    startAt: base.startAt ?? null,
    endAt: base.endAt ?? null,
    deliveryFeeLabel: extractStringField(lead, KOMMO_FIELD_IDS.deliveryFee),
    deliveryLocation: extractStringField(lead, KOMMO_FIELD_IDS.deliveryLocation),
    collectLocation: extractStringField(lead, KOMMO_FIELD_IDS.collectLocation),
    rentalDurationDays: extractIntegerField(lead, KOMMO_FIELD_IDS.durationDays),
    priceDaily: extractNumericField(lead, KOMMO_FIELD_IDS.priceDaily),
    insuranceFeeLabel: extractStringField(lead, KOMMO_FIELD_IDS.insuranceFee),
    fullInsuranceFee: extractNumericField(lead, KOMMO_FIELD_IDS.fullInsuranceFee),
    advancePayment: extractNumericField(lead, KOMMO_FIELD_IDS.advancePayment),
    salesOrderUrl: extractStringField(lead, KOMMO_FIELD_IDS.salesOrderUrl),
    agreementNumber: extractStringField(lead, KOMMO_FIELD_IDS.agreementNumber),
  }
}

async function syncClientDocuments(client: SupabaseClient, contact: any, clientId: string | null, lead?: any) {
  if (!clientId) return
  if (!DOCUMENTS_BUCKET) {
    console.warn("SUPABASE_STORAGE_DOCUMENTS_BUCKET not set, skipping Kommo document sync")
    return
  }

  if (contact?.id) {
    for (const mapping of DOCUMENT_FIELD_MAP) {
      const field = findCustomField(contact, mapping.fieldId)
      if (!field || !Array.isArray(field.values)) continue
      for (const entry of field.values) {
        const fileMeta = entry?.value
        const fileUuid = fileMeta?.file_uuid
        if (!fileUuid) continue
        await ensureClientDocument(client, {
          fileUuid: String(fileUuid),
          fileName: fileMeta?.file_name ?? `${fileUuid}.bin`,
          fileSize: fileMeta?.file_size ?? null,
          versionUuid: fileMeta?.version_uuid ?? null,
          docType: mapping.docType,
          clientId,
          contactId: String(contact.id),
          fieldId: mapping.fieldId,
          source: "custom_field",
          kommoEntityType: "contacts",
          kommoEntityId: String(contact.id),
        })
      }
    }

    await syncKommoDriveFiles(client, {
      clientId,
      contactId: String(contact.id),
      entityType: "contacts",
      entityId: String(contact.id),
    })
  }

  if (lead?.id) {
    await syncKommoDriveFiles(client, {
      clientId,
      contactId: contact?.id ? String(contact.id) : null,
      entityType: "leads",
      entityId: String(lead.id),
    })
  }
}

type DriveSyncParams = {
  clientId: string
  contactId?: string | null
  entityType: "contacts" | "leads"
  entityId: string
}

async function syncKommoDriveFiles(client: SupabaseClient, params: DriveSyncParams) {
  if (!params.entityId) return
  const files = await fetchKommoFilesForEntity(params.entityType, params.entityId)
  if (!files.length) return
  for (const file of files) {
    const payload = buildPayloadFromKommoFile(file, params)
    if (!payload) continue
    await ensureClientDocument(client, payload)
  }
}

async function fetchKommoFilesForEntity(entityType: "contacts" | "leads", entityId: string) {
  try {
    const response = await kommoGet(`/api/v4/${entityType}/${entityId}/files`)
    const files = response?._embedded?.files
    return Array.isArray(files) ? files : []
  } catch (error) {
    console.error("Failed to fetch Kommo files", {
      entityType,
      entityId,
      error: formatError(error),
    })
    return []
  }
}

function buildPayloadFromKommoFile(file: any, params: DriveSyncParams): DocumentSyncPayload | null {
  if (!file?.uuid) return null
  const fileName = buildFileNameFromKommoFile(file)
  const docType = guessDocumentTypeFromKommoFile(fileName, file)
  const size = typeof file?.size === "number" ? file.size : Number(file?.size ?? file?.metadata?.size ?? null)
  return {
    fileUuid: String(file.uuid),
    fileName,
    fileSize: Number.isFinite(size) ? Number(size) : null,
    versionUuid: file?.version_uuid ? String(file.version_uuid) : null,
    docType,
    clientId: params.clientId,
    contactId: params.contactId ?? null,
    source: "attachment",
    downloadUrl: file?._links?.download?.href ?? file?._links?.download_version?.href ?? null,
    kommoEntityType: params.entityType,
    kommoEntityId: params.entityId,
  }
}

function buildFileNameFromKommoFile(file: any) {
  const fallbackId =
    file?.uuid ??
    (typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `kommo-${Date.now().toString(36)}`)
  const raw =
    file?.sanitized_name ??
    file?.name ??
    file?._embedded?.file?.name ??
    (file?.metadata?.original_name as string | undefined) ??
    `kommo-file-${fallbackId}`
  const normalized = raw.replace(/\s+/g, "_")
  const extension = inferKommoExtension(file)
  if (extension && !normalized.toLowerCase().endsWith(`.${extension}`)) {
    return `${normalized}.${extension}`
  }
  return normalized
}

function inferKommoExtension(file: any) {
  const metaExt = (file?.metadata?.extension ?? file?.metadata?.ext) as string | undefined
  if (metaExt) return metaExt.toLowerCase()
  const mime = (file?.metadata?.mime_type ?? file?.metadata?.mimetype ?? file?.mime_type) as string | undefined
  if (!mime) return null
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }
  return map[mime.toLowerCase()] ?? null
}

function guessDocumentTypeFromKommoFile(fileName: string, file: any) {
  const normalized = fileName.toLowerCase()
  if (normalized.includes("passport")) return "passport_id"
  if (normalized.includes("license") || normalized.includes("licence") || normalized.includes("driver")) {
    return "driver_license"
  }
  if (normalized.includes("emirates")) return "emirates_id"
  if (normalized.includes("mulkiya") || normalized.includes("mulkiyah")) return "mulkiya"
  if (normalized.includes("insurance")) return "insurance"
  const type = (file?.type ?? file?.metadata?.type) as string | undefined
  if (type && typeof type === "string") {
    return type.toLowerCase()
  }
  return "kommo_file"
}

type DocumentSyncPayload = {
  fileUuid: string
  fileName: string
  fileSize: number | null
  versionUuid: string | null
  docType: string
  clientId: string
  contactId?: string | null
  fieldId?: number | null
  source?: "custom_field" | "attachment"
  downloadUrl?: string | null
  kommoEntityType?: string | null
  kommoEntityId?: string | null
}

let kommoDriveBaseUrl: string | null = null

async function resolveKommoDriveBaseUrl(): Promise<string> {
  if (kommoDriveBaseUrl) return kommoDriveBaseUrl
  const configured =
    Deno.env.get("KOMMO_FILES_BASE_URL") ??
    Deno.env.get("KOMMO_DRIVE_BASE_URL") ??
    Deno.env.get("KOMMO_DRIVE_URL") ??
    null
  if (configured) {
    kommoDriveBaseUrl = configured.replace(/\/$/, "")
    return kommoDriveBaseUrl
  }
  try {
    const account = await kommoGet("/api/v4/account?with=drive_url")
    const driveUrl = account?.drive_url
    if (driveUrl) {
      kommoDriveBaseUrl = String(driveUrl).replace(/\/$/, "")
      return kommoDriveBaseUrl
    }
  } catch (error) {
    console.error("Failed to fetch Kommo drive_url", formatError(error))
  }
  throw new Error("Unable to resolve Kommo drive_url. Set KOMMO_FILES_BASE_URL env var.")
}

async function fetchKommoFileDescriptor(fileUuid: string) {
  const driveBaseUrl = await resolveKommoDriveBaseUrl()
  const url = `${driveBaseUrl}/v1.0/files/${fileUuid}`
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}`,
    },
  })
  if (!resp.ok) {
    throw new Error(`Kommo file metadata request failed (${resp.status}) for ${fileUuid}`)
  }
  return resp.json()
}

function resolveDownloadUrlFromDescriptor(descriptor: any, versionUuid?: string | null) {
  const links = descriptor?._links ?? {}
  if (versionUuid && links?.download_version?.href) {
    return String(links.download_version.href)
  }
  if (links?.download_version?.href) return String(links.download_version.href)
  if (links?.download?.href) return String(links.download.href)
  return null
}

async function downloadKommoFile(fileUuid: string, options?: { versionUuid?: string | null; downloadUrl?: string | null }) {
  let targetUrl = options?.downloadUrl ?? null
  if (!targetUrl) {
    const descriptor = await fetchKommoFileDescriptor(fileUuid)
    targetUrl = resolveDownloadUrlFromDescriptor(descriptor, options?.versionUuid)
    if (!targetUrl) {
      throw new Error(`Kommo file download URL missing for ${fileUuid}`)
    }
  }

  const resp = await fetch(targetUrl, {
    headers: {
      Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}`,
    },
  })
  if (!resp.ok) {
    throw new Error(`Kommo file download failed (${resp.status}) for ${fileUuid}`)
  }
  const contentType = resp.headers.get("content-type") ?? "application/octet-stream"
  const normalized = contentType.toLowerCase()
  if (normalized.includes("application/json")) {
    const preview = (await resp.text()).slice(0, 200)
    throw new Error(`Kommo file download returned JSON for ${fileUuid}: ${preview}`)
  }
  const arrayBuffer = await resp.arrayBuffer()
  return { arrayBuffer, mimeType: contentType }
}

async function ensureClientDocument(client: SupabaseClient, payload: DocumentSyncPayload) {
  const { data: existingDoc, error: lookupError } = await client
    .from("documents")
    .select("id")
    .eq("metadata->>kommo_file_uuid", payload.fileUuid)
    .maybeSingle()

  if (lookupError) {
    console.error("Failed to lookup existing documents", lookupError)
    return
  }

  let documentId = existingDoc?.id ?? null

  if (!documentId) {
    let fileBuffer: ArrayBuffer | null = null
    let mimeType = "application/octet-stream"
    try {
      const downloadResult = await downloadKommoFile(payload.fileUuid, {
        versionUuid: payload.versionUuid,
        downloadUrl: payload.downloadUrl ?? null,
      })
      fileBuffer = downloadResult.arrayBuffer
      mimeType = downloadResult.mimeType
    } catch (error) {
      console.error("Failed to download Kommo file", {
        fileUuid: payload.fileUuid,
        error: formatError(error),
      })
      return
    }

    if (!fileBuffer) return
    const blob = new Blob([fileBuffer], { type: mimeType })
    const storagePath = buildStoragePathForDocument(payload, payload.fileName)

    const { error: uploadError } = await client.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, blob, { contentType: mimeType, upsert: true })
    if (uploadError) {
      console.error("Failed to upload document to Supabase storage", uploadError)
      return
    }

    const { data: insertedDoc, error: insertDocError } = await client
      .from("documents")
      .insert({
        bucket: DOCUMENTS_BUCKET,
        storage_path: storagePath,
        file_name: payload.fileName,
        original_name: payload.fileName,
        mime_type: mimeType,
        size_bytes: payload.fileSize ?? fileBuffer.byteLength,
        source: "Kommo",
        status: "needs_review",
        metadata: buildDocumentMetadata(payload),
      })
      .select("id")
      .single()

    if (insertDocError || !insertedDoc) {
      console.error("Failed to insert document row", insertDocError)
      return
    }
    documentId = insertedDoc.id
  }

  if (!documentId) return

  const { data: existingLink } = await client
    .from("document_links")
    .select("id")
    .eq("document_id", documentId)
    .eq("entity_id", payload.clientId)
    .limit(1)
    .maybeSingle()

  if (!existingLink) {
    const { error: linkError } = await client.from("document_links").insert({
      document_id: documentId,
      scope: "client",
      entity_id: payload.clientId,
      doc_type: payload.docType,
    })
    if (linkError) {
      console.error("Failed to create document link", linkError)
    }
  }
}

function sanitizeDocType(value: string) {
  return value?.toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "document"
}

function buildStoragePathForDocument(payload: DocumentSyncPayload, fileName: string) {
  const docTypeFolder = sanitizeDocType(payload.docType)
  return `clients/${payload.clientId}/${docTypeFolder}/${payload.fileUuid}-${fileName}`
}

function buildDocumentMetadata(payload: DocumentSyncPayload) {
  const metadata: Record<string, unknown> = {
    kommo_file_uuid: payload.fileUuid,
  }
  if (payload.fieldId != null) metadata.kommo_field_id = payload.fieldId
  if (payload.contactId) metadata.kommo_contact_id = payload.contactId
  if (payload.versionUuid) metadata.kommo_version_uuid = payload.versionUuid
  if (payload.source) metadata.kommo_source = payload.source
  if (payload.downloadUrl) metadata.kommo_download_url = payload.downloadUrl
  if (payload.kommoEntityType) metadata.kommo_entity_type = payload.kommoEntityType
  if (payload.kommoEntityId) metadata.kommo_entity_id = payload.kommoEntityId
  return metadata
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
    }

    const rawBody = await req.text()
    const signature = req.headers.get(SIGNATURE_HEADER)
    const validation = await validateSignature(rawBody, signature)
    if (!validation.ok) {
      console.error("Invalid Kommo signature", {
        reason: validation.reason,
        provided: validation.provided,
        expectedPrefix: validation.expected?.slice(0, 12),
      })
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 })
    }

    let payload: any
    let parsed = false
    try {
      payload = JSON.parse(rawBody)
      parsed = true
    } catch (jsonError) {
      try {
        payload = parseFormEncodedPayload(rawBody)
        parsed = true
      } catch (formError) {
        console.error("Invalid Kommo payload", {
          jsonError: formatError(jsonError),
          formError: formatError(formError),
        })
        return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { status: 400 })
      }
    }

    if (!parsed) {
      console.error("Unable to parse Kommo payload", rawBody.slice(0, 120))
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 })
    }

    const supabase = getServiceClient()

    const statusEventsRaw = payload?.leads?.status
    const statusEvents = Array.isArray(statusEventsRaw) ? statusEventsRaw : []
    if (!Array.isArray(statusEventsRaw)) {
      console.warn("Kommo status payload without iterable status array", {
        hasLeads: Boolean(payload?.leads),
      })
    }

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
          kommo_status_label: resolveKommoStatusLabel(String(event.status_id ?? "")),
          error_message: errorMessage,
        })
        results.push({ leadId: event.id, error: errorMessage })
      }
    }

    return new Response(JSON.stringify({ processed: results }), { status: 200 })
  } catch (error) {
    const message = formatError(error)
    console.error("kommo-status-webhook fatal error", message, error)
    return new Response(JSON.stringify({ error: "Internal server error", details: message }), {
      status: 500,
    })
  }
})
