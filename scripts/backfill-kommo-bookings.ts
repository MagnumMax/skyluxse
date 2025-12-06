
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN

if (!KOMMO_BASE_URL || !KOMMO_ACCESS_TOKEN) {
    console.error("Missing Kommo Env Vars")
    process.exit(1)
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

// --- Constants (Duplicated from route.ts for standalone script safety) ---
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

// --- Helpers ---

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
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

function extractFieldValue(contact: any, code: string) {
    // For backfill, we might not use the code-based helper if we use IDs primarily,
    // but duplicing logical structure.
    return null
}

function findCustomField(entity: any, fieldId: number) {
    if (!entity?.custom_fields_values) return null
    return entity.custom_fields_values.find((f: any) => Number(f.field_id) === fieldId)
}

function extractStringField(entity: any, fieldId: number): string | null {
    const field = findCustomField(entity, fieldId)
    const val = field?.values?.[0]?.value
    return asString(val)
}

function extractNumericField(entity: any, fieldId: number): number | null {
    const str = extractStringField(entity, fieldId)
    if (!str) return null
    const num = Number(str)
    return Number.isFinite(num) ? num : null
}

function extractIntegerField(entity: any, fieldId: number): number | null {
    const num = extractNumericField(entity, fieldId)
    return num != null ? Math.round(num) : null
}

function extractKommoEpoch(lead: any, fieldId: number): string | null {
    const str = extractStringField(lead, fieldId)
    // Sometimes it's a timestamp (number) or string date
    // route.ts logic:
    if (!fieldId) return null
    const field = findCustomField(lead, fieldId)
    if (!field) return null
    const values = field.values || []
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
    return null
}

// --- Main ---

async function main() {
    console.log("Starting backfill process...")

    // 1. Fetch Staff Map
    const { data: staffData, error: staffError } = await serviceClient
        .from("staff_accounts")
        .select("id, external_crm_id")
        .not("external_crm_id", "is", null)

    if (staffError) {
        console.error("Failed to fetch staff accounts", staffError)
        return
    }

    const staffMap = new Map<string, string>() // external_crm_id -> staff_id
    staffData.forEach((s) => {
        if (s.external_crm_id) staffMap.set(s.external_crm_id, s.id)
    })
    console.log(`Loaded ${staffMap.size} staff mappings.`)

    // 2. Fetch Bookings
    // Only fetch Kommo bookings. Limiting to active ones or all?
    // User said "for existing deals". Let's do all Kommo bookings.
    const { data: bookings, error: bookingsError } = await serviceClient
        .from("bookings")
        .select("id, external_code")
        .eq("channel", "Kommo")
        // .is("mileage_limit", null) // Optional: only process incomplete ones?
        // User implied "how to fill them", so "all" is safer to ensure consistency.
        .order("created_at", { ascending: false })

    if (bookingsError) {
        console.error("Failed to fetch bookings", bookingsError)
        return
    }

    console.log(`Found ${bookings.length} Kommo bookings to process.`)

    let processed = 0
    let updated = 0
    let errors = 0

    for (const booking of bookings) {
        const kommoIdStr = booking.external_code?.replace("K-", "")
        if (!kommoIdStr) {
            console.warn(`Skipping booking ${booking.id}: Invalid external_code ${booking.external_code}`)
            continue
        }

        const kommoId = Number(kommoIdStr)
        if (!Number.isFinite(kommoId)) {
            console.warn(`Skipping booking ${booking.id}: Invalid numeric ID ${kommoIdStr}`)
            continue
        }

        try {
            // Fetch Lead
            const leadResp = await fetch(`${KOMMO_BASE_URL}/api/v4/leads/${kommoId}?with=custom_fields`, {
                headers: { Authorization: `Bearer ${KOMMO_ACCESS_TOKEN}` }
            })

            if (!leadResp.ok) {
                if (leadResp.status === 404) {
                    // console.warn(`Lead ${kommoId} not found in Kommo (Booking ${booking.id})`)
                } else if (leadResp.status === 204) {
                    // No content
                } else {
                    console.error(`Failed to fetch lead ${kommoId}: ${leadResp.status}`)
                }
                errors++
                // Still sleep
                await sleep(500)
                continue
            }

            const lead = await leadResp.json()

            // Extract Fields
            const startAt = extractKommoEpoch(lead, KOMMO_DELIVERY_FIELD_ID) ?? extractKommoEpoch(lead, KOMMO_COLLECT_FIELD_ID)
            const endAt = extractKommoEpoch(lead, KOMMO_COLLECT_FIELD_ID) ?? startAt ?? null

            const ownerId = lead.responsible_user_id ? staffMap.get(String(lead.responsible_user_id)) : null

            const updates: any = {
                // start_at: startAt, // Do we overwrite dates? Maybe yes, to fix them if logic changed.
                // end_at: endAt,
                delivery_location: extractStringField(lead, KOMMO_FIELD_IDS.deliveryLocation),
                collect_location: extractStringField(lead, KOMMO_FIELD_IDS.collectLocation),
                delivery_fee_label: extractStringField(lead, KOMMO_FIELD_IDS.deliveryFee),
                insurance_fee_label: extractStringField(lead, KOMMO_FIELD_IDS.insuranceFee),
                rental_duration_days: extractIntegerField(lead, KOMMO_FIELD_IDS.durationDays),
                price_daily: extractNumericField(lead, KOMMO_FIELD_IDS.priceDaily),
                full_insurance_fee: extractNumericField(lead, KOMMO_FIELD_IDS.fullInsuranceFee),
                advance_payment: extractNumericField(lead, KOMMO_FIELD_IDS.advancePayment),
                sales_order_url: extractStringField(lead, KOMMO_FIELD_IDS.salesOrderUrl),
                agreement_number: extractStringField(lead, KOMMO_FIELD_IDS.agreementNumber),
                mileage_limit: extractStringField(lead, KOMMO_FIELD_IDS.kmLimit),
            }

            // Only update owner if we found a match. Don't null it out if we don't know it, 
            // unless we want to enforce sync.
            // If lead has responsible_user_id but we don't have mapping -> it stays what it was (via undefined) or null?
            // "upsertBooking" logic: `if (options.ownerId) payload.owner_id = options.ownerId`.
            // Let's mimic that: if we found an owner, set it.
            if (ownerId) {
                updates.owner_id = ownerId
            }

            // Clean undefined
            Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key])

            // Update Supabase
            const { error: updateError } = await serviceClient
                .from("bookings")
                .update(updates)
                .eq("id", booking.id)

            if (updateError) {
                console.error(`Failed to update booking ${booking.id}`, updateError)
                errors++
            } else {
                updated++
                // console.log(`Updated booking ${booking.id} (Lead ${kommoId})`)
            }

            processed++

            // Progress log every 10
            if (processed % 10 === 0) {
                console.log(`Processed ${processed}/${bookings.length}...`)
            }

        } catch (err) {
            console.error(`Error processing booking ${booking.id}`, err)
            errors++
        }

        // Rate limit: 2 per second => 500ms
        await sleep(500)
    }

    console.log(`Backfill complete. Updated: ${updated}, Errors: ${errors}, Total Processed: ${processed}`)
}

main()
