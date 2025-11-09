import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { timingSafeEqual } from "https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"

const MAX_BODY_BYTES = 1_048_576 // 1 MB safety limit per Kommo spec
const SIGNATURE_HEADER = "x-kommo-signature"

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

    const payload = JSON.parse(rawBody)
    const supabase = getServiceClient()

    const sourcePayloadId: string = payload?.id?.toString?.() ?? crypto.randomUUID()

    const { error: logError } = await supabase.from("kommo_webhook_events").insert({
      source_payload_id: sourcePayloadId,
      payload,
      hmac_validated: true,
      status: "received",
    })

    if (logError) {
      console.error("Failed to log Kommo payload", logError)
      return new Response(JSON.stringify({ error: "Unable to persist payload" }), { status: 500 })
    }

    const isLive = (Deno.env.get("ENABLE_KOMMO_LIVE") ?? "false").toLowerCase() === "true"

    if (!isLive) {
      return new Response(
        JSON.stringify({ status: "accepted", mode: "stubbed", payloadId: sourcePayloadId }),
        { status: 202 }
      )
    }

    // TODO: replace stub with real booking + client upsert.
    console.info("Kommo payload accepted for live ingestion", { sourcePayloadId })

    return new Response(
      JSON.stringify({ status: "queued", payloadId: sourcePayloadId }),
      { status: 200 }
    )
  } catch (error) {
    console.error("import-kommo error", error)
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
  }
})
