import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { delay } from "https://deno.land/std@0.224.0/async/delay.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"

const FEATURE_FLAG_KEY = "enableKommoLive"
const DEFAULT_YEAR = 2025
const PAGE_LIMIT = 100
const CONTACT_BATCH_LIMIT = 50
const CONTACT_PARALLEL = Number(Deno.env.get("KOMMO_CONTACT_PARALLEL") ?? "5")
const CONTACT_REQUEST_DELAY_MS = Number(Deno.env.get("KOMMO_CONTACT_DELAY_MS") ?? "80")
const VEHICLE_FIELD_ID = Number(Deno.env.get("KOMMO_VEHICLE_FIELD_ID") ?? "1234163")
const SOURCE_FIELD_ID = Number(Deno.env.get("KOMMO_SOURCE_FIELD_ID") ?? "823206")
const EXCLUDED_STATUS_IDS = new Set([143, 79790631, 91703923])

const sensitiveKeys = new Set([
  "access_token",
  "refresh_token",
  "token",
  "authorization",
  "client_secret",
  "client_id",
  "phone",
  "email",
  "passport_number",
])

function mask(value?: string | number | null) {
  if (value == null) return null
  const str = value.toString()
  if (str.length <= 4) return str
  return `${str.slice(0, 2)}…${str.slice(-2)}`
}

function maskPayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.map(maskPayload)
  }
  if (payload && typeof payload === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        result[key] = mask(typeof value === "string" ? value : JSON.stringify(value))
      } else {
        result[key] = maskPayload(value)
      }
    }
    return result
  }
  return payload
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack }
  }
  return maskPayload(error)
}

type KommoLead = {
  id: number
  status_id?: number
  created_at?: string | number
  updated_at?: string | number
  custom_fields_values?: Array<{
    field_id?: number
    field_code?: string | null
    values?: Array<{ enum_id?: number; value?: string }>
  }>
  _embedded?: {
    contacts?: Array<{ id: number; is_main?: boolean }>
  }
  [key: string]: unknown
}

type KommoContact = {
  id: number
  [key: string]: unknown
}

type KommoListResponse<T> = {
  _embedded?: { leads?: KommoLead[]; contacts?: KommoContact[] }
  _links?: { next?: { href: string } }
}

type RunCounters = {
  leads: number
  contacts: Set<number>
  vehicles: Set<number>
}

function normalizeTimestamp(value: unknown) {
  if (value == null) return null
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString()
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000
    return new Date(ms).toISOString()
  }
  return null
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
  const { data, error } = await client
    .from("system_feature_flags")
    .select("is_enabled")
    .eq("flag", flag)
    .maybeSingle()

  if (error) {
    console.error("Failed to read feature flag", serializeError(error))
    return false
  }

  return data?.is_enabled ?? false
}

function extractSelectEnumId(
  customFields: KommoLead["custom_fields_values"] | undefined,
  fieldId: number
) {
  if (!Array.isArray(customFields)) return null
  for (const field of customFields) {
    if (!field) continue
    if ((field.field_id ?? Number.NaN) !== fieldId) continue
    const value = field.values?.[0]
    if (value?.enum_id) return Number(value.enum_id)
  }
  return null
}

function extractMainContactId(lead: KommoLead) {
  const contacts = lead._embedded?.contacts
  if (!Array.isArray(contacts) || contacts.length === 0) return null
  const main = contacts.find((c) => c?.is_main) ?? contacts[0]
  return main?.id ?? null
}

function buildKommoUrl(path: string, searchParams?: Record<string, string | number>) {
  const base = requireEnv("KOMMO_BASE_URL")
  const url = new URL(path, base)
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, String(value))
    }
  }
  return url
}

async function kommoFetch<T>(url: URL): Promise<T> {
  const token = requireEnv("KOMMO_ACCESS_TOKEN")
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Kommo request failed (${resp.status}): ${text}`)
  }
  return resp.json() as Promise<T>
}

async function fetchLeadPage(opts: { page: number; from: string; to: string; limit?: number }) {
  const url = buildKommoUrl("/api/v4/leads", {
    limit: opts.limit ?? PAGE_LIMIT,
    page: opts.page,
    "filter[created_at][from]": opts.from,
    "filter[created_at][to]": opts.to,
    with: "contacts,catalog_elements,source_id",
    "order[created_at]": "desc",
  })
  const data = await kommoFetch<KommoListResponse<KommoLead>>(url)
  const leads = data._embedded?.leads ?? []
  const next = data._links?.next?.href ?? null
  return { leads, next }
}

async function fetchContactById(id: number) {
  const url = buildKommoUrl(`/api/v4/contacts/${id}`)
  try {
    return await kommoFetch<KommoContact>(url)
  } catch (error) {
    console.error(`Failed to fetch Kommo contact ${id}`, serializeError(error))
    return null
  }
}

async function stageContacts(
  client: SupabaseClient,
  runId: string,
  contactIds: number[],
  counters: RunCounters
) {
  const todo = contactIds.filter((id) => !counters.contacts.has(id))
  if (!todo.length) return
  for (let i = 0; i < todo.length; i += CONTACT_PARALLEL) {
    const chunk = todo.slice(i, i + CONTACT_PARALLEL)
    const contacts = await Promise.all(chunk.map((id) => fetchContactById(id)))
    for (const contact of contacts) {
      if (!contact) continue
      const { error } = await client.rpc("insert_stg_kommo_contact", {
        p_run_id: runId,
        p_contact_id: contact.id,
        p_payload: contact,
      })
      if (error) {
        throw new Error(`Failed to stage Kommo contact ${contact.id}: ${error.message}`)
      }
      counters.contacts.add(contact.id)
    }
    await delay(CONTACT_REQUEST_DELAY_MS)
  }
}

async function stageLeads(
  client: SupabaseClient,
  runId: string,
  year: number
): Promise<{ leads: number; contacts: number; vehicles: number }> {
  const counters: RunCounters = {
    leads: 0,
    contacts: new Set<number>(),
    vehicles: new Set<number>(),
  }

  const from = `${year}-01-01T00:00:00Z`
  const to = `${year + 1}-01-01T00:00:00Z`
  let page = 1
  let hasNext = true

  while (hasNext) {
    const { leads, next } = await fetchLeadPage({ page, from, to })
    if (!leads.length) break
    const contactIdsForPage: number[] = []

    for (const lead of leads) {
      if (lead.status_id && EXCLUDED_STATUS_IDS.has(lead.status_id)) continue
      counters.leads += 1

      const contactId = extractMainContactId(lead)
      if (contactId) contactIdsForPage.push(contactId)

      const vehicleEnumId = extractSelectEnumId(lead.custom_fields_values, VEHICLE_FIELD_ID)
      const sourceEnumId = extractSelectEnumId(lead.custom_fields_values, SOURCE_FIELD_ID)

      const kommoCreatedAt = normalizeTimestamp(lead.created_at)
      const kommoUpdatedAt = normalizeTimestamp(lead.updated_at)

      const { error: leadError } = await client.rpc("insert_stg_kommo_lead", {
        p_run_id: runId,
        p_lead_id: lead.id,
        p_contact_id: contactId,
        p_vehicle_enum_id: vehicleEnumId,
        p_source_enum_id: sourceEnumId,
        p_kommo_created_at: kommoCreatedAt ?? null,
        p_kommo_updated_at: kommoUpdatedAt ?? null,
        p_payload: lead,
      })

      if (leadError) {
        throw new Error(`Failed to stage Kommo lead ${lead.id}: ${leadError.message}`)
      }

      if (vehicleEnumId) {
        counters.vehicles.add(vehicleEnumId)
        const { error: linkErr } = await client.rpc("insert_stg_kommo_vehicle_link", {
          p_run_id: runId,
          p_lead_id: lead.id,
          p_vehicle_enum_id: vehicleEnumId,
        })
        if (linkErr) {
          throw new Error(`Failed to stage vehicle link for lead ${lead.id}: ${linkErr.message}`)
        }
      }
    }

    await stageContacts(client, runId, contactIdsForPage, counters)

    hasNext = Boolean(next)
    page += 1
    if (hasNext) {
      await delay(150)
    }
  }

  return {
    leads: counters.leads,
    contacts: counters.contacts.size,
    vehicles: counters.vehicles.size,
  }
}

async function startRun(client: SupabaseClient, triggeredBy: string | null): Promise<string> {
  const { data, error } = await client.rpc("start_kommo_import_run", {
    p_triggered_by: triggeredBy,
  })
  if (error || !data) {
    throw new Error(`Failed to start import run: ${error?.message ?? "unknown error"}`)
  }
  return data as string
}

async function finalizeRun(
  client: SupabaseClient,
  runId: string,
  status: "succeeded" | "failed" | "needs_review",
  counters: { leads: number; contacts: number; vehicles: number },
  errorMessage?: string
) {
  await client.rpc("finish_kommo_import_run", {
    p_run_id: runId,
    p_status: status,
    p_leads_count: counters.leads,
    p_contacts_count: counters.contacts,
    p_vehicles_count: counters.vehicles,
    p_error: errorMessage ?? null,
  })
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  const supabase = getServiceClient()
  const live = await isFeatureFlagEnabled(supabase, FEATURE_FLAG_KEY)
  if (!live) {
    return new Response(JSON.stringify({ error: "Kommo import disabled" }), { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const year = Number(body?.year ?? DEFAULT_YEAR)
  const triggeredBy = (req.headers.get("x-user-id") ?? body?.triggeredBy ?? null) as string | null

  let runId: string | null = null
  try {
    runId = await startRun(supabase, triggeredBy)
    const counters = await stageLeads(supabase, runId, year)
    await supabase.rpc("run_kommo_full_refresh", { p_run_id: runId })
    await finalizeRun(supabase, runId, "succeeded", counters)

    return new Response(
      JSON.stringify({
        runId,
        status: "succeeded",
        year,
        ...counters,
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error("Kommo full refresh failed", serializeError(error))
    if (runId) {
      const counters = { leads: 0, contacts: 0, vehicles: 0 }
      await finalizeRun(
        supabase,
        runId,
        "failed",
        counters,
        error instanceof Error ? error.message : String(error)
      )
    }
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        runId,
      }),
      { status: 500 }
    )
  }
})
