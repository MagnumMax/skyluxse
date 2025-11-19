import { serviceClient } from "@/lib/supabase/service-client"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
const GEMINI_FLASH_MODEL = "gemini-2.5-flash"
const GEMINI_PRO_MODEL = "gemini-2.5-pro"
const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models"
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 30000)

type RecognitionResult = {
  status: "done" | "failed" | "fallback_pro"
  model?: string
  confidence?: number | null
  error?: string | null
  payload?: any
}

type RecognitionOptions = {
  force?: boolean
  allowProFallback?: boolean
}

type DocumentLinkRecord = {
  document_id: string
  doc_type?: string | null
  metadata?: any
  created_at?: string | null
  document: {
    id: string
    bucket: string
    storage_path: string | null
    file_name?: string | null
    mime_type: string | null
    original_name: string | null
    metadata: any
    created_at?: string | null
  } | null
}

export async function recognizeLatestClientDocument(clientId: string, opts: RecognitionOptions = {}): Promise<RecognitionResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set")
  }

  const { data: clientRow, error: clientError } = await serviceClient
    .from("clients")
    .select("doc_status, doc_processed_at, doc_confidence")
    .eq("id", clientId)
    .maybeSingle()
  if (clientError) throw clientError

  const { data: docLinks, error: linkError } = await serviceClient
    .from("document_links")
    .select(
      "document_id, doc_type, metadata, created_at, document:documents(id, bucket, storage_path, file_name, mime_type, original_name, metadata, created_at)"
    )
    .eq("entity_id", clientId)
    .eq("scope", "client")
    .order("created_at", { ascending: false })
    .returns<DocumentLinkRecord[]>()
  if (linkError) throw linkError
  const links = (docLinks ?? []).filter((l) => l.document_id && l.document)
  if (!links.length) {
    throw new Error("No documents linked to client")
  }

  const docCreatedAt = links[0].created_at ?? links[0].document?.created_at ?? null
  const alreadyProcessed =
    !opts.force &&
    clientRow?.doc_status === "done" &&
    clientRow.doc_processed_at &&
    docCreatedAt &&
    new Date(clientRow.doc_processed_at).getTime() >= new Date(docCreatedAt).getTime()
  if (alreadyProcessed) {
    return { status: "done", model: clientRow.doc_status, confidence: clientRow.doc_confidence ?? null, error: null }
  }

  const results = []
  for (const link of links) {
    const single = await processSingleDocument(link, opts)
    results.push(single)
  }

  // запишем главным тот, что первый (самый свежий)
  const primaryResult = results[0]
  const payloadArray = results.map((r) => r.payload)

  const update: Record<string, any> = {
    doc_status: results.length > 1 ? "done_multi" : primaryResult.status,
    doc_model: primaryResult.model,
    doc_confidence: primaryResult.confidence ?? null,
    doc_document_id: primaryResult.documentId,
    doc_raw: payloadArray,
    doc_processed_at: new Date().toISOString(),
    doc_error: primaryResult.error ?? null,
    doc_type: primaryResult.payload?.doc_type ?? primaryResult.docType ?? null,
    doc_full_name: primaryResult.payload?.full_name ?? null,
    doc_first_name: primaryResult.payload?.first_name ?? null,
    doc_last_name: primaryResult.payload?.last_name ?? null,
    doc_middle_name: primaryResult.payload?.middle_name ?? null,
    doc_date_of_birth: normalizeDate(primaryResult.payload?.date_of_birth),
    doc_nationality: primaryResult.payload?.nationality ?? null,
    doc_address: primaryResult.payload?.address ?? null,
    doc_document_number: primaryResult.payload?.document_number ?? null,
    doc_issue_date: normalizeDate(primaryResult.payload?.issue_date),
    doc_expiry_date: normalizeDate(primaryResult.payload?.expiry_date),
    doc_issuing_country: primaryResult.payload?.issuing_country ?? null,
    doc_driver_class: primaryResult.payload?.driver_class ?? null,
    doc_driver_restrictions: primaryResult.payload?.driver_restrictions ?? null,
    doc_driver_endorsements: primaryResult.payload?.driver_endorsements ?? null,
  }

  const { error: updateError } = await serviceClient.from("clients").update(update).eq("id", clientId)
  if (updateError) throw updateError

  return {
    status: update.doc_status,
    model: update.doc_model,
    confidence: update.doc_confidence,
    error: update.doc_error,
    payload: payloadArray,
  }
}

async function processSingleDocument(
  link: any,
  opts: RecognitionOptions
): Promise<{ status: RecognitionResult["status"]; model?: string; confidence?: number | null; error?: string | null; payload: any; documentId: string; docType?: string | null }> {
  const bucket = link.document.bucket
  const path = link.document.storage_path ?? link.document.file_name
  if (!bucket || !path) {
    return { status: "failed", error: "Document storage location missing", payload: null, documentId: link.document_id }
  }

  const signed = await serviceClient.storage.from(bucket).createSignedUrl(path, 300)
  if (signed.error || !signed.data?.signedUrl) {
    return { status: "failed", error: signed.error?.message ?? "sign error", payload: null, documentId: link.document_id }
  }

  const downloadResp = await fetch(signed.data.signedUrl)
  if (!downloadResp.ok) {
    return { status: "failed", error: `Download failed ${downloadResp.status}`, payload: null, documentId: link.document_id }
  }
  const arrayBuffer = await downloadResp.arrayBuffer()
  const mimeType = downloadResp.headers.get("content-type") ?? link.document.mime_type ?? "application/octet-stream"
  const base64Data = Buffer.from(arrayBuffer).toString("base64")

  const prompt = buildPrompt(link.doc_type ?? link.document?.metadata?.doc_type)
  const schema = buildSchema()

  const primary = await callGemini({
    model: GEMINI_FLASH_MODEL,
    prompt,
    base64Data,
    mimeType,
    schema,
  })

  let final = primary
  const allowPro = opts.allowProFallback ?? true
  const lowConfidence = primary.ok && (primary.confidence ?? 0) < 0.7
  if (allowPro && (!primary.ok || lowConfidence)) {
    const fallback = await callGemini({
      model: GEMINI_PRO_MODEL,
      prompt,
      base64Data,
      mimeType,
      schema,
    })
    final = fallback.ok ? { ...fallback, model: GEMINI_PRO_MODEL } : fallback
  }

  return {
    status: final.ok ? (final.model === GEMINI_PRO_MODEL ? "fallback_pro" : "done") : "failed",
    model: final.model,
    confidence: final.confidence ?? null,
    error: final.ok ? null : final.error ?? "Unknown Gemini error",
    payload: final.parsed ?? final.raw ?? null,
    documentId: link.document_id,
    docType: link.doc_type ?? link.document?.metadata?.doc_type ?? null,
  }
}

function buildPrompt(docType?: string | null) {
  const label = docType ? docType.replace(/[_-]/g, " ") : "identity document"
  return `Extract identity fields for car rental compliance. Document type: ${label}. Return strict JSON per schema; set missing values to null; include licence classes/restrictions if present; prefer ISO country codes.`
}

function buildSchema() {
  return {
    type: "object",
    properties: {
      status: { type: "string", enum: ["ok", "uncertain"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      doc_type: { type: "string" },
      full_name: { type: "string", nullable: true },
      first_name: { type: "string", nullable: true },
      last_name: { type: "string", nullable: true },
      middle_name: { type: "string", nullable: true },
      date_of_birth: { type: "string", nullable: true },
      nationality: { type: "string", nullable: true },
      address: { type: "string", nullable: true },
      document_number: { type: "string", nullable: true },
      issue_date: { type: "string", nullable: true },
      expiry_date: { type: "string", nullable: true },
      issuing_country: { type: "string", nullable: true },
      driver_class: { type: "string", nullable: true },
      driver_restrictions: { type: "string", nullable: true },
      driver_endorsements: { type: "string", nullable: true },
    },
    required: ["status", "confidence"],
  }
}

async function callGemini(params: {
  model: string
  prompt: string
  base64Data: string
  mimeType: string
  schema: Record<string, unknown>
}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  try {
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: params.prompt },
            { inlineData: { data: params.base64Data, mimeType: params.mimeType } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        responseMimeType: "application/json",
        responseSchema: params.schema,
      },
    }

    const url = `${GEMINI_API_ROOT}/${params.model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY!)}`
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!resp.ok) {
      return { ok: false as const, model: params.model, error: `Gemini ${resp.status}: ${await resp.text()}` }
    }
    const json = await resp.json()
    const textPayload = extractText(json)
    if (!textPayload) {
      return { ok: false as const, model: params.model, error: "Empty Gemini response", raw: json }
    }
    let parsed: any
    try {
      parsed = JSON.parse(textPayload)
    } catch (e) {
      return { ok: false as const, model: params.model, error: `Parse error: ${String(e)}`, raw: json }
    }
    const confidence = normalizeConfidence(parsed?.confidence)
    parsed.confidence = confidence
    return { ok: true as const, model: params.model, parsed, raw: json, confidence }
  } catch (error) {
    clearTimeout(timeout)
    return { ok: false as const, model: params.model, error: String(error) }
  }
}

function extractText(json: any): string | null {
  const content = json?.candidates?.[0]?.content
  const parts = Array.isArray(content?.parts) ? content.parts : []
  const textPayload = parts
    .map((p: any) => p?.text ?? p?.inlineData?.data ?? "")
    .filter(Boolean)
    .join("")
  return textPayload || null
}

function normalizeConfidence(value: any): number | undefined {
  if (value === null || value === undefined) return undefined
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return undefined
  if (numeric > 1) return Math.min(1, numeric / 100)
  if (numeric < 0) return 0
  return Number(numeric.toFixed(2))
}

function normalizeDate(value: any): string | null {
  if (!value) return null
  const str = String(value).trim()
  if (!str) return null
  const parsed = Date.parse(str)
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10)
  const m = str.match(/(\\d{4}-\\d{2}-\\d{2})/)
  if (m?.[1]) return m[1]
  return null
}
