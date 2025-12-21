'use client'

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Client, ClientDocument, ClientDocumentRecognition } from "@/lib/domain/entities"
import { cn } from "@/lib/utils"

type Props = {
  client: Client
}

type RecognitionRunResult = {
  status?: string
  model?: string
  confidence?: number | null
  error?: string | null
  payload?: any
}

export function ClientDocumentRecognitionPanel({ client }: Props) {
  const [localRecognition, setLocalRecognition] = useState<ClientDocumentRecognition | undefined>(client.documentRecognition)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const documents = client.documents
  const clientId = client.id

  useEffect(() => {
    setLocalRecognition(client.documentRecognition)
  }, [client.documentRecognition])

  const statusLabel = useMemo(() => {
    const status = localRecognition?.status ?? "not_started"
    if (status === "done_multi") return "done (multiple)"
    return status
  }, [localRecognition?.status])

  const statusTone = useMemo(() => {
    const status = localRecognition?.status ?? "pending"
    if (status === "done" || status === "done_multi") return "text-emerald-600"
    if (status === "failed") return "text-rose-600"
    if (status === "fallback_pro") return "text-amber-600"
    if (status === "processing") return "text-primary"
    return "text-muted-foreground"
  }, [localRecognition?.status])

  const processedLabel = localRecognition?.processedAt
    ? `Processed ${formatDateTime(localRecognition.processedAt)}`
    : "Not processed yet"

  const rawItems = (
    Array.isArray(localRecognition?.raw)
      ? localRecognition?.raw ?? []
      : localRecognition?.raw
        ? [localRecognition.raw]
        : []
  ).filter((item) => !!item)

  const derivedItems = rawItems.length
    ? rawItems
    : [
      {
        doc_type: localRecognition?.docType,
        // Fallback to client data if no raw data items, simulating the "parsed" view from current state
        full_name: client.name,
        first_name: client.firstName,
        last_name: client.lastName,
        middle_name: client.middleName,
        date_of_birth: client.dateOfBirth,
        nationality: client.nationality,
        address: client.address,
        document_number: client.documentNumber,
        issue_date: client.issueDate,
        expiry_date: client.expiryDate,
        issuing_country: client.issuingCountry,
        driver_class: client.driverClass,
        driver_restrictions: client.driverRestrictions,
        driver_endorsements: client.driverEndorsements,
        rawDocId: localRecognition?.documentId,
      },
    ]

  async function handleRun(force = true) {
    setIsRunning(true)
    setError(null)
    try {
      const resp = await fetch("/api/recognition/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, force, allowProFallback: true }),
      })
      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(text || `Failed with status ${resp.status}`)
      }
      const json = await resp.json()
      const result: RecognitionRunResult | undefined = json?.result ?? json
      if (!result) throw new Error("Empty response from recognition")
      const next = mergeRecognition(localRecognition, result)
      setLocalRecognition(next)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className={cn("uppercase tracking-wide", statusTone)}>
            {statusLabel}
          </Badge>
          <span className="text-muted-foreground">{processedLabel}</span>
          {localRecognition?.confidence != null ? (
            <span className="text-xs text-muted-foreground">Confidence {Math.round(localRecognition.confidence * 100)}%</span>
          ) : null}
          {localRecognition?.model ? <span className="text-xs text-muted-foreground">{localRecognition.model}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {error ? <span className="text-xs text-rose-600">{error}</span> : null}
          <Button size="sm" variant="outline" onClick={() => handleRun(false)} disabled={isRunning}>
            {isRunning ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            {localRecognition ? "Re-run" : "Run recognition"}
          </Button>
          <Button size="sm" onClick={() => handleRun(true)} disabled={isRunning}>
            {isRunning ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
            Force refresh
          </Button>
        </div>
      </div>

      {isRunning ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>Running document recognition...</span>
        </div>
      ) : null}

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Documents</h4>
        {documents.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {documents.map((doc) => (
              <div key={doc.id} className="space-y-2 rounded-xl border border-border/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.type}</p>
                  </div>
                  <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
                    {doc.status ?? "active"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {doc.number ? <span>#{doc.number}</span> : null}
                  {doc.expiry ? <span>Expires {formatDate(doc.expiry)}</span> : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Source open <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No URL</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            No documents available for this client.
          </div>
        )}
      </div>

      {derivedItems.length ? (
        <div className="space-y-4">
          {derivedItems.map((item, idx) => {
            const docLabel = formatDocType(item.doc_type) || `Document ${idx + 1}`
            const match =
              documents.find((doc) => doc.number === item.document_number || doc.id === item.rawDocId || doc.id === localRecognition?.documentId) ??
              null
            const link = match?.url
            const rawJson = item ? JSON.stringify(item, null, 2) : null
            return (
              <div key={`${item.document_number ?? idx}`} className="space-y-3 rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">{docLabel}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {match?.number ? <Badge variant="outline">#{match.number}</Badge> : null}
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Open <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
                <dl className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <KeyVal label="Doc type" value={docLabel} />
                  <KeyVal label="Document #" value={item.document_number ?? "—"} />
                  <KeyVal label="DOB" value={formatDate(item.date_of_birth)} />
                  <KeyVal label="Nationality" value={item.nationality ?? "—"} />
                  <KeyVal label="Issuing country" value={item.issuing_country ?? "—"} />
                  <KeyVal label="Issued" value={formatDate(item.issue_date)} />
                  <KeyVal label="Expires" value={formatDate(item.expiry_date)} />
                  <KeyVal label="Class" value={item.driver_class ?? "—"} />
                  <KeyVal label="Restrictions" value={item.driver_restrictions ?? "—"} />
                  <KeyVal label="Endorsements" value={item.driver_endorsements ?? "—"} />
                  <KeyVal label="Address" value={item.address ?? "—"} />
                </dl>
                {rawJson ? (
                  <details className="rounded-xl border border-border/70 bg-muted/10 p-3 text-xs text-muted-foreground">
                    <summary className="cursor-pointer text-sm font-semibold text-foreground">Raw JSON</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed">{rawJson}</pre>
                  </details>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
          Recognition output will appear here after processing.
        </div>
      )}
    </div>
  )
}

function mergeRecognition(
  current: ClientDocumentRecognition | undefined,
  result: RecognitionRunResult
): ClientDocumentRecognition {
  const payloadArray = Array.isArray(result?.payload) ? result.payload : result?.payload ? [result.payload] : []
  const primaryPayload = payloadArray[0] ?? {}

  return {
    ...current,
    status: result.status ?? current?.status ?? "processing",
    model: result.model ?? current?.model,
    confidence: result.confidence ?? current?.confidence,
    error: result.error ?? undefined,
    processedAt: new Date().toISOString(),
    raw: payloadArray.length ? payloadArray : result.payload ?? current?.raw,
    docType: primaryPayload.doc_type ?? current?.docType,
  }
}

function KeyVal({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg bg-muted/30 px-2 py-1.5">
      <dt className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  )
}

function formatDate(value?: string): string {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Dubai", month: "short", day: "numeric", year: "numeric" })
}

function formatDateTime(value?: string): string {
  if (!value) return "Not recorded"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-CA", { timeZone: "Asia/Dubai", dateStyle: "medium", timeStyle: "short" })
}

function formatDocType(value?: string) {
  if (!value) return "—"
  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}
