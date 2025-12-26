import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { serviceClient } from "@/lib/supabase/service-client"
import { recognizeLatestClientDocument } from "@/lib/ai/document-recognition"
import { createSalesOrderForBooking } from "@/app/actions/zoho"
import { KOMMO_STATUSES_FOR_SALES_ORDER } from "@/lib/constants/bookings"
import { sendNotification } from "@/lib/notifications"

const SIGNATURE_HEADER = "x-kommo-signature"
const REQUIRE_SIGNATURE = false

const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL ?? ""
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN ?? ""
const KOMMO_WEBHOOK_SECRET = process.env.KOMMO_WEBHOOK_SECRET ?? ""
const DOCUMENTS_BUCKET =
    process.env.SUPABASE_STORAGE_DOCUMENTS_BUCKET ?? process.env.STORAGE_DOCUMENTS_BUCKET ?? ""
const KOMMO_VEHICLE_FIELD_ID = process.env.KOMMO_VEHICLE_FIELD_ID ?? "1234163"
const KOMMO_VEHICLE_FIELD_CODE = process.env.KOMMO_VEHICLE_FIELD_CODE?.toLowerCase()
const KOMMO_DELIVERY_FIELD_ID = Number(process.env.KOMMO_DELIVERY_FIELD_ID ?? "1218176")
const KOMMO_COLLECT_FIELD_ID = Number(process.env.KOMMO_COLLECT_FIELD_ID ?? "1218178")

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
    kmLimit: 1235349,
}

const DOCUMENT_FIELD_MAP = [
    { fieldId: 1234167, docType: "passport_id" },
    { fieldId: 1234169, docType: "driver_license" },
    { fieldId: 1234171, docType: "emirates_id" },
]

const KOMMO_MAX_RETRIES = Math.max(1, Math.floor(coerceEnvNumber(process.env.KOMMO_MAX_RETRIES, 4)))
const KOMMO_RETRY_BASE_DELAY_MS = Math.max(
    100,
    Math.floor(coerceEnvNumber(process.env.KOMMO_RETRY_BASE_DELAY_MS, 500))
)
const KOMMO_RETRY_MAX_DELAY_MS = Math.max(
    KOMMO_RETRY_BASE_DELAY_MS,
    Math.floor(coerceEnvNumber(process.env.KOMMO_RETRY_MAX_DELAY_MS, 5000))
)

const KOMMO_STATUS_CONFIG: Record<string, { label: string; bookingStatus: string }> = {
    "75440383": { label: "Incoming Leads", bookingStatus: "lead" },
    "79790631": { label: "Request Bot Answering", bookingStatus: "lead" },
    "91703923": { label: "Follow Up", bookingStatus: "lead" },
    "96150292": { label: "Waiting for Payment", bookingStatus: "confirmed" },
    "98035992": { label: "Sales order sent", bookingStatus: "confirmed" }, // Added missing status
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

const COUNTRY_MAP: Record<string, string> = {
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

export const maxDuration = 60 // Allow longer processing time for Vercel Pro/Enterprise

function coerceEnvNumber(value: string | undefined, fallback: number) {
    if (!value) return fallback
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : fallback
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

    // Simple string comparison is fine here as we are not strictly preventing timing attacks in this context
    // but for correctness we can use a constant time compare if available, or just strict equality
    const valid = expected === headerValue.toLowerCase()
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

async function kommoGet(path: string, attempt = 1): Promise<any> {
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

    if (resp.status === 204) return null

    const text = await resp.text()
    if (!text.trim()) return null

    try {
        return JSON.parse(text)
    } catch (error) {
        throw new Error(`Failed to parse Kommo response JSON: ${formatError(error)}. Body: ${text.slice(0, 200)}`)
    }
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

function extractEnumId(entity: any, fieldId: number) {
    const field = findCustomField(entity, fieldId)
    if (!field || !Array.isArray(field.values) || !field.values.length) return null
    const entry = field.values[0]
    if (entry?.enum_id !== undefined && entry?.enum_id !== null) {
        return String(entry.enum_id)
    }
    // Fallback to extractStringField logic if no enum_id (e.g. text field)
    // But for ID extraction we specifically want the ID.
    return null
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

async function findStaffByKommoId(kommoUserId: string | number) {
    const { data } = await serviceClient
        .from("staff_accounts")
        .select("id")
        .eq("external_crm_id", String(kommoUserId))
        .maybeSingle()
    return data?.id ?? null
}

async function upsertClient(contact: any, fallbackName: string) {
    const kommoContactId = contact?.id ? String(contact.id) : null
    const phone = extractFieldValue(contact, "PHONE")
    const email = extractFieldValue(contact, "EMAIL")
    const nationality = normalizeCountryLabel(extractFieldByName(contact, "Nationality"))
    const gender = normalizeGenderLabel(extractFieldByName(contact, "Gender"))

    const payload: Record<string, any> = {
        kommo_contact_id: kommoContactId,
        name: contact?.name ?? fallbackName ?? "Kommo contact",
    }

    if (phone) payload.phone = phone
    if (email) payload.email = email
    if (nationality) payload.residency_country = nationality
    if (gender) payload.gender = gender

    // Note: We don't map owner for clients yet, as they are shared global entities usually.
    // If needed, we could map responsible_user_id here too, but prioritized for leads/bookings.

    const { data, error } = await serviceClient
        .from("clients")
        .upsert(payload, { onConflict: "kommo_contact_id" })
        .select("id")
        .maybeSingle()

    if (error) throw error
    return data?.id ?? null
}

async function upsertSalesLead(
    lead: any,
    clientId: string | null,
    stageId: string | null
) {
    const leadCode = leadSourcePayloadId(lead.id)
    const ownerId = lead.responsible_user_id
        ? await findStaffByKommoId(lead.responsible_user_id)
        : null

    const payload: Record<string, any> = {
        lead_code: leadCode,
        client_id: clientId,
        value_amount: lead.price ?? 0,
        updated_at: new Date().toISOString(),
    }
    if (stageId) payload.stage_id = stageId
    if (ownerId) payload.owner_id = ownerId

    const { data, error } = await serviceClient
        .from("sales_leads")
        .upsert(payload, { onConflict: "lead_code" })
        .select("id")
        .maybeSingle()

    if (error) throw error
    return data?.id ?? null
}

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
    kommoStatusId?: number | null
    ownerId?: string | null
    mileageLimit?: string | null
    totalAmount?: number | null
}

async function upsertBooking(
    lead: any,
    clientId: string | null,
    bookingStatus: string,
    options: BookingOptions = {}
) {
    const sourcePayloadId = leadSourcePayloadId(lead.id)
    const { data: existing, error: fetchError } = await serviceClient
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
        kommo_status_id: options.kommoStatusId ?? (lead?.status_id ? Number(lead.status_id) : null),
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
    if (options.totalAmount !== undefined && options.totalAmount !== null) payload.total_amount = options.totalAmount

    // Only update owner if explicitly provided (found via mapping)
    if (options.ownerId) payload.owner_id = options.ownerId
    if (options.mileageLimit !== undefined) payload.mileage_limit = options.mileageLimit

    if (existing) {
        const { error } = await serviceClient
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
        const { data, error } = await serviceClient
            .from("bookings")
            .insert(insertPayload)
            .select("id")
            .single()
        if (error) throw error
        return data.id
    }
}

async function logBookingTimelineEvent(
    bookingId: string,
    statusId: string,
    statusLabel: string,
    pipelineId: string
) {
    const message = `Kommo status changed to "${statusLabel}" (${statusId}) in pipeline ${pipelineId}`
    await serviceClient.from("booking_timeline_events").insert({
        booking_id: bookingId,
        event_type: "status_change",
        message,
        payload: { kommoStatusId: statusId, kommoPipelineId: pipelineId },
    })
}

type HandleResult = {
    leadId: number | string
    processed?: boolean
    skipped?: boolean
    statusId: string | null
    statusLabel: string | null
    leadData?: any
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

async function findVehicleByKommoId(kommoVehicleId: string) {
    const { data, error } = await serviceClient
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

function buildBookingOptions(
    lead: any,
    base: BookingOptions
): BookingOptions {
    return {
        vehicleId: base.vehicleId ?? null,
        startAt: base.startAt ?? null,
        endAt: base.endAt ?? null,
        deliveryFeeLabel: extractEnumId(lead, KOMMO_FIELD_IDS.deliveryFee) ?? extractStringField(lead, KOMMO_FIELD_IDS.deliveryFee),
        deliveryLocation: extractStringField(lead, KOMMO_FIELD_IDS.deliveryLocation),
        collectLocation: extractStringField(lead, KOMMO_FIELD_IDS.collectLocation),
        rentalDurationDays: extractIntegerField(lead, KOMMO_FIELD_IDS.durationDays),
        priceDaily: extractNumericField(lead, KOMMO_FIELD_IDS.priceDaily),
        insuranceFeeLabel: extractEnumId(lead, KOMMO_FIELD_IDS.insuranceFee) ?? extractStringField(lead, KOMMO_FIELD_IDS.insuranceFee),
        fullInsuranceFee: extractNumericField(lead, KOMMO_FIELD_IDS.fullInsuranceFee),
        advancePayment: extractNumericField(lead, KOMMO_FIELD_IDS.advancePayment),
        salesOrderUrl: extractStringField(lead, KOMMO_FIELD_IDS.salesOrderUrl),
        agreementNumber: extractStringField(lead, KOMMO_FIELD_IDS.agreementNumber),
        mileageLimit: extractStringField(lead, KOMMO_FIELD_IDS.kmLimit),
        kommoStatusId: base.kommoStatusId ?? null,
        totalAmount: lead.price !== undefined ? Number(lead.price) : null,
    }
}

async function syncClientDocuments(contact: any, clientId: string | null, lead?: any) {
    if (!clientId) return
    if (!DOCUMENTS_BUCKET) {
        console.warn("SUPABASE_STORAGE_DOCUMENTS_BUCKET not set, skipping Kommo document sync")
        return
    }

    const promises: Promise<void>[] = []

    if (contact?.id) {
        for (const mapping of DOCUMENT_FIELD_MAP) {
            const field = findCustomField(contact, mapping.fieldId)
            if (!field || !Array.isArray(field.values)) continue
            for (const entry of field.values) {
                const fileMeta = entry?.value
                const fileUuid = fileMeta?.file_uuid
                if (!fileUuid) continue
                promises.push(
                    ensureClientDocument({
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
                )
            }
        }

        promises.push(
            syncKommoDriveFiles({
                clientId,
                contactId: String(contact.id),
                entityType: "contacts",
                entityId: String(contact.id),
            })
        )
    }

    if (lead?.id) {
        promises.push(
            syncKommoDriveFiles({
                clientId,
                contactId: contact?.id ? String(contact.id) : null,
                entityType: "leads",
                entityId: String(lead.id),
            })
        )
    }

    await Promise.all(promises)
}

type DriveSyncParams = {
    clientId: string
    contactId?: string | null
    entityType: "contacts" | "leads"
    entityId: string
}

async function syncKommoDriveFiles(params: DriveSyncParams) {
    if (!params.entityId) return
    const files = await fetchKommoFilesForEntity(params.entityType, params.entityId)
    if (!files.length) return

    await Promise.all(
        files.map((file: any) => {
            const payload = buildPayloadFromKommoFile(file, params)
            if (!payload) return Promise.resolve()
            return ensureClientDocument(payload)
        })
    )
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

let kommoDriveBaseUrl: string | null = null

async function resolveKommoDriveBaseUrl(): Promise<string> {
    if (kommoDriveBaseUrl) return kommoDriveBaseUrl
    const configured =
        process.env.KOMMO_FILES_BASE_URL ??
        process.env.KOMMO_DRIVE_BASE_URL ??
        process.env.KOMMO_DRIVE_URL ??
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

    const text = await resp.text()
    if (!text.trim()) return null

    try {
        return JSON.parse(text)
    } catch (e) {
        throw new Error(`Failed to parse file descriptor: ${formatError(e)}. Body: ${text.slice(0, 100)}`)
    }
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

async function ensureClientDocument(payload: DocumentSyncPayload) {
    const { data: existingDoc, error: lookupError } = await serviceClient
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

        const { error: uploadError } = await serviceClient.storage
            .from(DOCUMENTS_BUCKET)
            .upload(storagePath, blob, { contentType: mimeType, upsert: true })
        if (uploadError) {
            console.error("Failed to upload document to Supabase storage", uploadError)
            return
        }

        const { data: insertedDoc, error: insertDocError } = await serviceClient
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

    const { data: existingLink } = await serviceClient
        .from("document_links")
        .select("id")
        .eq("document_id", documentId)
        .eq("entity_id", payload.clientId)
        .limit(1)
        .maybeSingle()

    if (!existingLink) {
        const { error: linkError } = await serviceClient.from("document_links").insert({
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

function normalizeStatusId(value: any): string | null {
    if (value === null || value === undefined) return null
    const str = String(value).trim()
    return str.length ? str : null
}

async function handleStatusChange(event: any): Promise<HandleResult> {
    let statusId = normalizeStatusId(event.status_id)
    let pipelineId = normalizeStatusId(event.pipeline_id)

    const lead = await kommoGet(`/api/v4/leads/${event.id}?with=contacts,custom_fields`)
    if (!lead) {
        throw new Error(`Lead ${event.id} not found in Kommo or empty response`)
    }

    const contactId = lead?._embedded?.contacts?.find((c: any) => c.is_main)?.id ?? lead?._embedded?.contacts?.[0]?.id
    const contact = contactId ? await kommoGet(`/api/v4/contacts/${contactId}?with=custom_fields`) : null
    const leadStatusId = normalizeStatusId(lead?.status_id)
    const leadPipelineId = normalizeStatusId(lead?.pipeline_id)

    if (!statusId && leadStatusId) statusId = leadStatusId
    if (!pipelineId && leadPipelineId) pipelineId = leadPipelineId

    const statusLabel = resolveKommoStatusLabel(statusId ?? "")

    const clientId = await upsertClient(contact, lead.name ?? `Lead ${event.id}`)
    if (clientId) {
        // Always sync docs for now, or check logic if needed
        await syncClientDocuments(contact, clientId, lead).catch((error) =>
            console.error("Failed to sync Kommo documents", error)
        )
    }
    const stageId = mapPipelineStage(String(pipelineId ?? event.pipeline_id ?? ""), String(statusId ?? ""))
    await upsertSalesLead(lead, clientId, stageId)
    const bookingStatus = mapBookingStatus(String(statusId ?? ""))
    const kommoVehicleId = extractKommoVehicleId(lead)
    let vehicleMatch: { id: string } | null = null
    if (kommoVehicleId) {
        vehicleMatch = await findVehicleByKommoId(kommoVehicleId)
        if (!vehicleMatch) {
            console.warn("Vehicle from Kommo not found in Supabase", { kommoVehicleId })
        }
    }

    // Resolve owner
    const ownerId = lead.responsible_user_id
        ? await findStaffByKommoId(lead.responsible_user_id)
        : null

    const startAt =
        extractKommoEpoch(lead, KOMMO_DELIVERY_FIELD_ID) ?? extractKommoEpoch(lead, KOMMO_COLLECT_FIELD_ID)
    const endAt = extractKommoEpoch(lead, KOMMO_COLLECT_FIELD_ID) ?? startAt ?? null

    const bookingOptions = buildBookingOptions(lead, {
        vehicleId: vehicleMatch?.id ?? null,
        startAt: startAt ?? null,
        endAt: endAt ?? null,
        kommoStatusId: Number(statusId), // Use resolved statusId, not raw event.status_id
        ownerId,
    })

    // Check for Zero Amount on confirmed statuses
    const CONFIRMED_STATUSES = ["98035992", "75440391", "75440395", "75440399"];
    if (statusId && CONFIRMED_STATUSES.includes(statusId) && (!bookingOptions.totalAmount || bookingOptions.totalAmount <= 0)) {
         await sendNotification('telegram', {
             message: `⚠️ <b>Zero Amount Warning</b>\nBooking: ${bookingOptions.agreementNumber ?? 'Unknown'}\nLead: ${lead.id}\nStatus: ${statusLabel}\nAmount: ${bookingOptions.totalAmount ?? 0}`
        })
    }

    const statusIdForTimeline = statusId ?? "unknown"
    const pipelineForTimeline = pipelineId ?? event.pipeline_id ?? "unknown"
    const bookingId = await upsertBooking(lead, clientId, bookingStatus, bookingOptions)
    if (bookingId) {
        await logBookingTimelineEvent(bookingId, statusIdForTimeline, statusLabel, pipelineForTimeline)

        // Trigger Zoho Sales Order creation if status is in the configured list
        // The check for existing sales order is handled inside createSalesOrderForBooking
        
        // Debug Log
        console.log("Checking Zoho Trigger:", { statusId, inList: KOMMO_STATUSES_FOR_SALES_ORDER.includes(statusId as any) });

        if (statusId && KOMMO_STATUSES_FOR_SALES_ORDER.includes(statusId as any)) {
            try {
                console.log(`Triggering Zoho Sales Order for booking ${bookingId} (Kommo status: ${statusId})`)
                const result = await createSalesOrderForBooking(bookingId)
                if (result.success) {
                    if (result.data.message === "Sales Order already exists") {
                        await logBookingTimelineEvent(
                            bookingId,
                            statusIdForTimeline,
                            `Zoho Sales Order already exists: ${result.data.salesOrderId}`,
                            pipelineForTimeline
                        )
                    } else {
                        await logBookingTimelineEvent(
                            bookingId,
                            statusIdForTimeline,
                            `Created Zoho Sales Order: ${result.data.salesOrderUrl ?? "Success"}`,
                            pipelineForTimeline
                        )
                    }
                } else {
                    console.error("Failed to create Zoho Sales Order from webhook", result.error)
                    await logBookingTimelineEvent(
                        bookingId,
                        statusIdForTimeline,
                        `Failed to create Zoho Sales Order: ${result.error}`,
                        pipelineForTimeline
                    )
                    await sendNotification('telegram', {
                        message: `❌ <b>Sales Order Failed</b>\nLead: ${lead.id}\nError: ${result.error}`
                    })
                }
            } catch (error) {
                console.error("Error executing createSalesOrderForBooking", error)
                await sendNotification('telegram', {
                    message: `❌ <b>Sales Order Exception</b>\nLead: ${lead.id}\nError: ${error instanceof Error ? error.message : "Unknown error"}`
                })
                await logBookingTimelineEvent(
                    bookingId,
                    statusIdForTimeline,
                    `Error creating Zoho Sales Order: ${error instanceof Error ? error.message : "Unknown error"}`,
                    pipelineForTimeline
                ).catch((logError) => {
                    console.error("Failed to log timeline event", logError)
                })
            }
        }
    }

    const shouldRunRecognition = clientId && statusId === "75440395" // Delivery Within 24 Hours
    if (shouldRunRecognition) {
        // Trigger recognition only at the last editable stage
        await recognizeLatestClientDocument(clientId).catch((error) => {
            console.error("Document recognition failed", {
                clientId,
                error: formatError(error),
            })
        })
    }

    return { leadId: event.id, processed: true, statusId, statusLabel, leadData: lead }
}

type PathToken = string | number

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

export async function POST(req: Request) {
    try {
        const rawBody = await req.text()
        const headerList = await headers()
        const signature = headerList.get(SIGNATURE_HEADER)

        const validation = await validateSignature(rawBody, signature)
        if (!validation.ok) {
            console.error("Invalid Kommo signature", {
                reason: validation.reason,
                provided: validation.provided,
                expectedPrefix: validation.expected?.slice(0, 12),
            })
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
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
                return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
            }
        }

        if (!parsed) {
            console.error("Unable to parse Kommo payload", rawBody.slice(0, 120))
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
        }

        const statusEventsRaw = payload?.leads?.status
        const statusEvents = Array.isArray(statusEventsRaw) ? statusEventsRaw : []
        if (!Array.isArray(statusEventsRaw)) {
            console.warn("Kommo status payload without iterable status array", {
                hasLeads: Boolean(payload?.leads),
            })
        }

        const results = []
        // Process sequentially to avoid overwhelming Kommo API or Supabase
        for (const event of statusEvents) {
            try {
                const result = await handleStatusChange(event)
                await serviceClient.from("kommo_webhook_events").insert({
                    source_payload_id: String(event.id),
                    payload,
                    fetched_data: result?.leadData ?? null,
                    hmac_validated: true,
                    status: result?.skipped ? "skipped" : "processed",
                    kommo_status_id: result?.statusId ?? String(event.status_id ?? ""),
                    kommo_status_label: result?.statusLabel ?? null,
                })
                results.push(result)
            } catch (error) {
                const errorMessage = formatError(error)
                console.error("Failed to process status event", errorMessage, error)
                await serviceClient.from("kommo_webhook_events").insert({
                    source_payload_id: String(event.id),
                    payload,
                    hmac_validated: true,
                    status: "failed",
                    kommo_status_id: String(event.status_id ?? ""),
                    kommo_status_label: resolveKommoStatusLabel(String(event.status_id ?? "")),
                    error_message: errorMessage,
                })
                await sendNotification('telegram', {
                    message: `🚨 <b>Webhook Error</b>\nLead: ${event.id}\nError: ${errorMessage}`
                })
                results.push({ leadId: event.id, error: errorMessage })
            }
        }

        return NextResponse.json({ processed: results })
    } catch (error) {
        const message = formatError(error)
        console.error("kommo-webhook fatal error", message, error)
        return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 })
    }
}
