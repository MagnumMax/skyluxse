"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, AlertTriangle, ExternalLink, FileText, Mail } from "lucide-react"

import { DriverTaskCard, TaskStatusBadge } from "@/components/driver-task-card"
import { DriverTaskForm } from "@/components/driver-task-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Client, Task } from "@/lib/domain/entities"
import { AdditionalService, TaskAdditionalService } from "@/lib/domain/additional-services"
import { formatDate } from "@/lib/formatters"

const DAY_MS = 24 * 60 * 60 * 1000
const SOON_THRESHOLD_DAYS = (() => {
  const raw = process.env.NEXT_PUBLIC_DOCUMENT_SOON_THRESHOLD_DAYS
  const num = Number(raw)
  if (!Number.isFinite(num) || num <= 0) return 30
  return Math.min(num, 365)
})()
const SOON_THRESHOLD_MS = SOON_THRESHOLD_DAYS * DAY_MS

function getExpiryState(expiry?: string, nowTs?: number): "expired" | "soon" | "active" | "none" {
  if (!expiry || !nowTs) return "none"
  const ts = new Date(expiry).getTime()
  if (!Number.isFinite(ts)) return "none"
  if (ts < nowTs) return "expired"
  if (ts - nowTs <= SOON_THRESHOLD_MS) return "soon"
  return "active"
}

function daysUntil(expiry?: string, nowTs?: number): number | null {
  if (!expiry || !nowTs) return null
  const ts = new Date(expiry).getTime()
  if (!Number.isFinite(ts)) return null
  if (ts <= nowTs) return 0
  const diff = ts - nowTs
  return Math.ceil(diff / DAY_MS)
}

function daysSince(expiry?: string, nowTs?: number): number | null {
  if (!expiry || !nowTs) return null
  const ts = new Date(expiry).getTime()
  if (!Number.isFinite(ts)) return null
  if (ts >= nowTs) return 0
  const diff = nowTs - ts
  return Math.ceil(diff / DAY_MS)
}

function getDaysLabel(n: number): string {
  return n === 1 ? "day" : "days"
}

function normalizeType(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function canonicalType(value?: string) {
  const s = normalizeType(value)
  if (!s) return s
  if (s.includes("passport")) return "passport"
  if (s.includes("emirates") && s.includes("id")) return "emirates_id"
  if (s.includes("license") || s.includes("licence") || s.includes("dl")) return "driver_license"
  if (s.endsWith(" id") || s === "id") return "id"
  return s
}

function isIdLike(value?: string) {
  const c = canonicalType(value)
  return c === "passport" || c === "emirates_id" || c === "id"
}

const KOMMO_BASE_URL = process.env.NEXT_PUBLIC_KOMMO_BASE_URL || process.env.KOMMO_BASE_URL

function buildKommoLeadUrl(bookingCode?: string): string | undefined {
  if (!bookingCode || !KOMMO_BASE_URL) return undefined
  if (bookingCode.startsWith("K-")) {
    const leadId = bookingCode.slice(2)
    if (!leadId) return undefined
    try {
      const base = new URL(KOMMO_BASE_URL)
      const normalizedPath = base.pathname.endsWith("/") ? base.pathname.slice(0, -1) : base.pathname
      base.pathname = `${normalizedPath}/leads/detail/${leadId}`
      return base.toString()
    } catch {
      return undefined
    }
  }
  return undefined
}

function buildMapsUrl(type: Task["type"], geo: Task["geo"]) {
  if (!geo) return null
  const dest = type === "delivery" ? geo.dropoff : geo.pickup
  if (!dest) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`
}

function normalizePhone(phone?: string) {
  if (!phone) return undefined
  return phone.replace(/\D/g, "")
}

function buildWhatsAppText(task: Task) {
  return `Hello, this is regarding your ${task.type} for ${task.vehicleName ?? "vehicle"}.`
}

function DocumentItem({ doc, client, nowTs }: { doc: any; client: Client; nowTs: number }) {
  const raw = client?.documentRecognition?.raw
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : []
  const docCanon = canonicalType(doc.type)
  const rec = arr.find((x: any) => canonicalType(x?.doc_type) === docCanon) ?? null
  const expiryVal = doc.expiry ?? (rec ? rec.expiry_date : undefined) ?? (isIdLike(doc.type) ? client?.expiryDate : undefined)
  const docNumber = doc.number ?? rec?.document_number ?? (isIdLike(doc.type) ? client?.documentNumber : undefined)
  const state = expiryVal ? getExpiryState(expiryVal, nowTs) : "none"

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground text-sm">{doc.type}</p>
        </div>
        <div className="flex items-center gap-2">
          {docNumber ? (
            <Badge variant="outline" className="border-border text-[10px] tracking-wider text-muted-foreground">
              #{docNumber}
            </Badge>
          ) : null}
          {String(doc.status ?? "").toLowerCase() !== "needs_review" ? (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {(() => {
                if (state === "expired") return "Expired"
                if (state === "soon") return "Expiring"
                return "Active"
              })()}
            </Badge>
          ) : null}
        </div>
      </div>

      {(() => {
        if (!expiryVal) return null
        if (state === "expired") {
          const d = daysSince(expiryVal, nowTs) ?? 0
          return (
            <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="size-3" />
              {`Expired ${d} ${getDaysLabel(d)} ago`} ({formatDate(expiryVal, { month: "short", day: "numeric", year: "numeric" })})
            </p>
          )
        }
        if (state === "soon") {
          const d = daysUntil(expiryVal, nowTs) ?? 0
          return (
            <p className="mt-1 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="size-3" />
              {`Expires in ${d} ${getDaysLabel(d)}`} ({formatDate(expiryVal, { month: "short", day: "numeric", year: "numeric" })})
            </p>
          )
        }
        return (
          <p className="mt-1 text-xs text-muted-foreground">
            Expires {formatDate(expiryVal, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )
      })()}
    </>
  )

  const containerClasses = `block rounded-lg border px-3 py-2 transition-colors hover:bg-muted/50 ${(() => {
    if (state === "expired") return "border-destructive/30 bg-destructive/5"
    if (state === "soon") return "border-yellow-500/30 bg-yellow-500/5"
    return "border-border"
  })()}`

  return (
    <li>
      {doc.url ? (
        <a href={doc.url} target="_blank" rel="noreferrer" className={containerClasses}>
          {content}
        </a>
      ) : (
        <div className={containerClasses}>{content}</div>
      )}
    </li>
  )
}

export function DriverTaskDetail({
  task,
  client,
  additionalServices,
  availableServices,
  kommoLeadUrl: kommoLeadUrlProp,
  handoverPhotos,
  signedPhotoUrls,
  minOdometer,
  baselineOdometer,
  baselineFuel,
  backHref,
}: {
  task: Task
  client?: Client
  additionalServices?: TaskAdditionalService[]
  availableServices?: AdditionalService[] // Kept for interface compatibility
  kommoLeadUrl?: string
  handoverPhotos?: string[]
  signedPhotoUrls?: Record<string, string[]>
  minOdometer?: number
  baselineOdometer?: number
  baselineFuel?: number
  backHref?: string
}) {
  const [isOnline, setIsOnline] = useState<boolean>(typeof window === "undefined" ? true : navigator.onLine)
  const [nowTs] = useState(() => Date.now())

  // Note: Input handling logic was removed as it was not used in the UI.
  // If needed, restore from previous version or implement Input/Service UI.

  const mapUrl = buildMapsUrl(task.type, task.geo)
  const phoneDigits = normalizePhone(client?.phone ?? task.clientPhone)
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(buildWhatsAppText(task))}`
    : undefined
  const kommoLeadUrl = kommoLeadUrlProp ?? buildKommoLeadUrl(task.bookingCode)

  const details: { label: string; value: string }[] = [] // Currently empty as per original code

  useEffect(() => {
    function onOnline() {
      setIsOnline(true)
    }
    function onOffline() {
      setIsOnline(false)
    }
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  return (
    <div className="space-y-6 text-foreground">
      {!isOnline ? (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm font-medium text-yellow-600 dark:text-yellow-400">
          Offline. Data and photos will be saved when connection is restored.
        </div>
      ) : null}
      
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground pl-0 hover:bg-transparent"
      >
        <Link href={toRoute(backHref ?? "/driver/tasks")}>
          <ArrowLeft className="h-4 w-4" />
          {backHref ? "Back" : "Back to list"}
        </Link>
      </Button>

      <DriverTaskCard
        task={task}
        clickable={false}
        showEta={false}
        showClient={false}
        mapUrl={mapUrl ?? undefined}
      >
        <div className="flex flex-col gap-4">
          {details.length ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {details.map((item) => (
                <div key={item.label} className="space-y-1">
                  <dt className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">{item.label}</dt>
                  <dd className="text-base font-semibold text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="flex w-full items-center justify-between gap-2 pt-2 border-t border-border">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="tracking-wider">#{task.bookingCode ?? task.bookingId}</span>
              {task.zohoSalesOrderUrl ? (
                <a
                  href={task.zohoSalesOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground hover:underline transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Sales order</span>
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TaskStatusBadge status={task.status} className="text-[10px] sm:text-xs" />
            </div>
          </div>
        </div>
      </DriverTaskCard>

      {client ? (
        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30 pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">{client.name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full"
                  disabled={!kommoLeadUrl && !whatsappUrl}
                >
                  <a
                    href={kommoLeadUrl ?? whatsappUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>{kommoLeadUrl ? "Kommo" : "Message"}</span>
                  </a>
                </Button>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-foreground">Documents</h3>
              {client.documents.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {client.documents.map((doc) => (
                    <DocumentItem key={doc.id} doc={doc} client={client} nowTs={nowTs} />
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <FileText className="mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No documents found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {task.type === "pickup" ? (
        <Accordion type="single" collapsible className="rounded-xl border border-border bg-card shadow-sm">
          <AccordionItem value="handover-photos" className="border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Handover Photos</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              {handoverPhotos && handoverPhotos.length > 0 ? (
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                  {handoverPhotos.map((image) => (
                    <div key={image} className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
                      <a href={image} target="_blank" rel="noreferrer" className="block h-full w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt="Handover" className="h-full w-full object-cover" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <FileText className="mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No photos available</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}

      <DriverTaskForm
        task={task}
        signedPhotoUrls={signedPhotoUrls}
        minOdometer={minOdometer}
        baselineOdometer={baselineOdometer}
        baselineFuel={baselineFuel}
      />
    </div>
  )
}

function toRoute(path: string) {
  return path as Parameters<typeof Link>[0]["href"]
}
