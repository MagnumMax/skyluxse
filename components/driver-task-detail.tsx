"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"

import { completeTask, deleteTaskPhoto, signTaskPhotoUrl, submitTaskInputs } from "@/app/(driver)/driver/tasks/actions"
import { DriverTaskCard } from "@/components/driver-task-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Client, Task } from "@/lib/domain/entities"
import { supabaseBrowser } from "@/lib/supabase/browser-client"
import { formatDate } from "@/lib/formatters"
import { AlertTriangle, MapPin } from "lucide-react"

import { taskTypeLabels } from "./driver-task-card"

type DriverInput = NonNullable<Task["requiredInputs"]>[number]

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

function ruDays(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "день"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня"
  return "дней"
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

export function DriverTaskDetail({ task, client }: { task: Task; client?: Client }) {
  const [status, setStatus] = useState<Task["status"]>(task.status)
  const [isOnline, setIsOnline] = useState<boolean>(typeof window === "undefined" ? true : navigator.onLine)
  const [nowTs] = useState(() => Date.now())
  const previousOdometer =
    task.inputValues?.find((value) => value.key === "odometer" || value.key.startsWith("odo_"))?.valueNumber ??
    task.lastVehicleOdometer ??
    undefined
  const previousFuel =
    task.inputValues?.find((value) => value.key === "fuel_level" || value.key.startsWith("fuel_"))?.valueNumber ??
    task.lastVehicleFuel ??
    undefined
  const existingPhotos =
    task.inputValues
      ?.filter((value) => value.storagePaths?.length && value.key.toLowerCase().includes("photo"))
      .flatMap((value) =>
        (value.storagePaths ?? []).map((path) => ({
          path,
          bucket: value.bucket ?? "task-media",
          key: value.key,
        }))
      ) ?? []
  const details = [] as { label: string; value: string }[]
  const taskWithLiveStatus = { ...task, status } as Task
  const isDone = status === "done"
  const mapUrl = buildMapsUrl(task.geo)
  const phoneDigits = normalizePhone(client?.phone ?? task.clientPhone)
  const telUrl = phoneDigits ? `tel:${phoneDigits}` : undefined
  const whatsappUrl = phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(buildWhatsAppText(task))}` : undefined

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
    <div className="space-y-5 text-white">
      {!isOnline ? (
        <div className="rounded-2xl border border-white/20 bg-amber-600/20 px-4 py-2 text-sm text-amber-100">Нет сети. Данные и фото будут сохранены при восстановлении соединения.</div>
      ) : null}
      <Button
        asChild
        variant="outline"
        size="sm"
        className="w-fit rounded-full border-white/25 bg-white/5 px-3 py-1.5 text-white hover:border-white/40 hover:bg-white/10"
      >
        <Link href="/driver/tasks">← Назад к списку</Link>
      </Button>

      <DriverTaskCard task={taskWithLiveStatus} clickable={false} showEta={false} showLocationHeader={false}>
        <div className="flex flex-col gap-2 text-sm text-white/80">
          {details.length ? (
            <dl className="grid grid-cols-2 gap-2 text-[0.75rem] text-white/70 sm:grid-cols-3">
              {details.map((item) => (
                <div key={item.label} className="space-y-1">
                  <dt className="text-[0.55rem] uppercase tracking-[0.35em] text-white/60">{item.label}</dt>
                  <dd className="text-sm font-semibold text-white">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {task.geo ? (
            (() => {
              const text = (() => {
                if (task.type === "delivery") return task.geo.dropoff ?? ""
                if (task.type === "pickup") return task.geo.pickup ?? ""
                return task.geo.pickup && task.geo.dropoff
                  ? `${task.geo.pickup} → ${task.geo.dropoff}`
                  : task.geo.pickup || task.geo.dropoff || ""
              })()
              if (!text) return null
              return (
                <div className="text-sm text-white/80">
                  {mapUrl ? (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <MapPin className="h-4 w-4" />
                      {text}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {text}
                    </span>
                  )}
                </div>
              )
            })()
          ) : null}
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-white/25 bg-white/5 px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.3em]"
              >
                #{task.bookingCode ?? task.bookingId}
              </Badge>
              
            </div>
            <div className="flex flex-wrap items-center gap-2"></div>
          </div>
        </div>
      </DriverTaskCard>

      {client ? (
        <Card className="rounded-3xl border border-white/15 bg-white/5 text-white shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-white/60">Клиент</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-base font-semibold text-white">{client.name}</p>
                <p className="text-xs text-white/70">{client.email}</p>
                <p className="text-xs text-white/70">{client.phone}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline" className="rounded-full border-white/25 bg-white/5 px-3 py-1 text-xs font-semibold text-white hover:border-white/40 hover:bg-white/10" disabled={!telUrl}>
                  <a href={telUrl ?? "#"}>Позвонить</a>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-full border-white/25 bg-white/5 px-3 py-1 text-xs font-semibold text-white hover:border-white/40 hover:bg-white/10" disabled={!whatsappUrl}>
                  <a href={whatsappUrl ?? "#"} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Документы</h3>
              {client.documents.length ? (
                <ul className="space-y-3 text-sm text-white/80">
                  {client.documents.map((doc) => (
                    <li key={doc.id}>
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`block rounded-2xl border px-3 py-2 hover:bg-white/10 ${(() => {
                            const state = getExpiryState(doc.expiry, nowTs)
                            if (state === "expired") return "border-rose-400/40 bg-rose-900/20"
                            if (state === "soon") return "border-amber-400/40 bg-amber-900/20"
                            return "border-white/15"
                          })()}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-white">{doc.type}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const raw = client?.documentRecognition?.raw
                                const arr = Array.isArray(raw) ? raw : raw ? [raw] : []
                                const docCanon = canonicalType(doc.type)
                                const rec = arr.find((x: any) => canonicalType(x?.doc_type) === docCanon) ?? null
                                const n = doc.number ?? rec?.document_number ?? (isIdLike(doc.type) ? client?.documentNumber : undefined)
                                return n ? (
                                  <Badge variant="outline" className="text-[11px] tracking-wider">#{n}</Badge>
                                ) : null
                              })()}
                              {String(doc.status ?? "").toLowerCase() !== "needs_review" ? (
                                <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
                                  {(() => {
                                    const raw = client?.documentRecognition?.raw
                                    const arr = Array.isArray(raw) ? raw : raw ? [raw] : []
                                    const docCanon = canonicalType(doc.type)
                                    const rec = arr.find((x: any) => canonicalType(x?.doc_type) === docCanon) ?? null
                                    const expiryVal = doc.expiry ?? (rec ? rec.expiry_date : undefined) ?? (isIdLike(doc.type) ? client?.expiryDate : undefined)
                                    const state = getExpiryState(expiryVal, nowTs)
                                    if (state === "expired") return "Expired"
                                    if (state === "soon") return "Expiring"
                                    return "Active"
                                  })()}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          
                          {(() => {
                            const raw = client?.documentRecognition?.raw
                            const arr = Array.isArray(raw) ? raw : raw ? [raw] : []
                            const docCanon = canonicalType(doc.type)
                            const rec = arr.find((x: any) => canonicalType(x?.doc_type) === docCanon) ?? null
                            const expiryVal = doc.expiry ?? (rec ? rec.expiry_date : undefined) ?? (isIdLike(doc.type) ? client?.expiryDate : undefined)
                            if (!expiryVal) return null
                            const state = getExpiryState(expiryVal, nowTs)
                            if (state === "expired") {
                              const d = daysSince(expiryVal, nowTs) ?? 0
                              return (
                                <p className="flex items-center gap-1 text-xs text-rose-300">
                                  <AlertTriangle className="size-3 animate-pulse" />
                                  {`Истёк ${d} ${ruDays(d)} назад`} ({formatDate(expiryVal, { month: "short", day: "numeric", year: "numeric" })})
                                </p>
                              )
                            }
                            if (state === "soon") {
                              const d = daysUntil(expiryVal, nowTs) ?? 0
                              return (
                                <p className="flex items-center gap-1 text-xs text-amber-300">
                                  <AlertTriangle className="size-3" />
                                  {`Скоро истекает через ${d} ${ruDays(d)}`} ({formatDate(expiryVal, { month: "short", day: "numeric", year: "numeric" })})
                                </p>
                              )
                            }
                            return <p className="text-xs text-white/70">Истекает {formatDate(expiryVal, { month: "short", day: "numeric", year: "numeric" })}</p>
                          })()}
                        </a>
                      ) : (
                        <div className={`rounded-2xl border px-3 py-2 ${(() => {
                          const state = getExpiryState(doc.expiry, nowTs)
                          if (state === "expired") return "border-rose-400/40 bg-rose-900/20"
                          if (state === "soon") return "border-amber-400/40 bg-amber-900/20"
                          return "border-white/15"
                        })()}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-white">{doc.type}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const raw = client?.documentRecognition?.raw
                                const arr = Array.isArray(raw) ? raw : raw ? [raw] : []
                                const docCanon = canonicalType(doc.type)
                                const rec = arr.find((x: any) => canonicalType(x?.doc_type) === docCanon) ?? null
                                const n = doc.number ?? rec?.document_number ?? (isIdLike(doc.type) ? client?.documentNumber : undefined)
                                return n ? (
                                  <Badge variant="outline" className="text-[11px] tracking-wider">#{n}</Badge>
                                ) : null
                              })()}
                              {String(doc.status ?? "").toLowerCase() !== "needs_review" ? (
                                <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
                                  {(() => {
                                    const raw = client?.documentRecognition?.raw
                                    const arr = Array.isArray(raw) ? raw : raw ? [raw] : []
                                    const docCanon = canonicalType(doc.type)
                                    const rec = arr.find((x: any) => canonicalType(x?.doc_type) === docCanon) ?? null
                                    const expiryVal = doc.expiry ?? (rec ? rec.expiry_date : undefined) ?? (isIdLike(doc.type) ? client?.expiryDate : undefined)
                                    const state = getExpiryState(expiryVal, nowTs)
                                    if (state === "expired") return "Expired"
                                    if (state === "soon") return "Expiring"
                                    return "Active"
                                  })()}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          
                          {(() => {
                            const raw = client?.documentRecognition?.raw
                            const arr = Array.isArray(raw) ? raw : raw ? [raw] : []
                            const docCanon = canonicalType(doc.type)
                            const rec = arr.find((x: any) => canonicalType(x?.doc_type) === docCanon) ?? null
                            const expiryVal = doc.expiry ?? (rec ? rec.expiry_date : undefined) ?? (isIdLike(doc.type) ? client?.expiryDate : undefined)
                            if (!expiryVal) return null
                            const state = getExpiryState(expiryVal, nowTs)
                            if (state === "expired") {
                              const d = daysSince(expiryVal, nowTs) ?? 0
                              return (
                                <p className="flex items-center gap-1 text-xs text-rose-300">
                                  <AlertTriangle className="size-3 animate-pulse" />
                                  {`Истёк ${d} ${ruDays(d)} назад`} ({formatDate(expiryVal, { month: "short", day: "numeric", year: "numeric" })})
                                </p>
                              )
                            }
                            if (state === "soon") {
                              const d = daysUntil(expiryVal, nowTs) ?? 0
                              return (
                                <p className="flex items-center gap-1 text-xs text-amber-300">
                                  <AlertTriangle className="size-3" />
                                  {`Скоро истекает через ${d} ${ruDays(d)}`} ({formatDate(expiryVal, { month: "short", day: "numeric", year: "numeric" })})
                                </p>
                              )
                            }
                            return <p className="text-xs text-white/70">Истекает {formatDate(expiryVal, { month: "short", day: "numeric", year: "numeric" })}</p>
                          })()}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/70">Документы не загружены.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-3xl border border-white/15 bg-white/5 text-white shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-white/60">Заполнить</CardTitle>
        </CardHeader>
        <CardContent>
          <DriverTaskInputs
            taskId={String(task.id)}
            inputs={task.requiredInputs ?? []}
            previousOdometer={previousOdometer}
            previousFuel={previousFuel}
            photos={existingPhotos}
            isDone={isDone}
            onCompleted={(nextStatus) => setStatus(nextStatus)}
            outstanding={typeof task.outstandingAmount === "number" ? task.outstandingAmount : undefined}
            currency={task.currency ?? "AED"}
          />
        </CardContent>
      </Card>
    </div>
  )
}

type DriverTaskInputsProps = {
  taskId: string
  inputs: NonNullable<Task["requiredInputs"]>
  previousOdometer?: number
  previousFuel?: number
  photos?: { path: string; bucket?: string; key?: string }[]
  isDone?: boolean
  onCompleted?: (status: Task["status"]) => void
  outstanding?: number
  currency?: string
}

function DriverTaskInputs({
  taskId,
  inputs,
  previousOdometer,
  previousFuel,
  photos = [],
  isDone = false,
  onCompleted,
  outstanding,
  currency = "AED",
}: DriverTaskInputsProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [fuelLevel, setFuelLevel] = useState<number>(() => parseFuelFraction(previousFuel) ?? 8)
  const [odometerValue, setOdometerValue] = useState<number | undefined>(undefined)
  const [existingPhotos, setExistingPhotos] = useState(photos)
  const [displayPhotos, setDisplayPhotos] = useState<Array<{ path: string; bucket?: string; url?: string; key?: string }>>(photos)
  const [deletePending, setDeletePending] = useState<string | null>(null)
  const [localFiles, setLocalFiles] = useState<Array<{ id: string; url: string; file: File; name: string; kind: "photos" | "damage" }>>([])
  const [fileInputResetKey, setFileInputResetKey] = useState(0)
  const localFilesRef = useRef(localFiles)
  const [paymentInput, setPaymentInput] = useState<number | undefined>(undefined)
  const fieldCardBase = "rounded-2xl border border-white/15 bg-slate-950/40 px-4 py-3 shadow-sm"
  const returnPhotosCardClass = "rounded-2xl border border-white/15 bg-white/5 px-4 py-3 space-y-3"
  const labelClass = "text-sm font-semibold text-white/90"
  const sectionHintClass = "text-[0.65rem] uppercase tracking-[0.35em] text-white/60"

  const normalizedInputs: DriverInput[] = useMemo(() => {
    const filtered = (inputs ?? []).filter(
      (input) => !isSignatureInput(input) && !isCleaningInput(input)
    )
    if (!filtered.length) {
      return [
        { key: "odometer", label: "Одометр", type: "number", required: true },
        { key: "fuel", label: "Топливо/заряд", type: "select", required: true, options: ["Full", "3/4", "1/2", "1/4", "Empty"] },
        { key: "photos", label: "Фото", type: "file", required: true, multiple: true, accept: "image/*" },
        { key: "damage_notes", label: "Заметки о повреждениях", type: "text", required: false },
      ]
    }
    return filtered
  }, [inputs])

  const handleSubmit = (formData: FormData) => {
    if (isDone) return
    setMessage(null)
    startTransition(async () => {
      formData.set("taskId", taskId)
      formData.delete("photos")
      formData.delete("damage_photos")
      if (paymentInput !== undefined) {
        formData.set("paymentCollected", String(paymentInput))
      }
      localFiles.forEach((item) => {
        formData.append(item.name, item.file, item.file.name)
      })
      const saveResult = await submitTaskInputs(formData)
      if (!saveResult.success) {
        setMessage(saveResult.message ?? "Не удалось сохранить данные")
        return
      }
      const completeResult = await completeTask({ taskId })
      if (!completeResult.success) {
        setMessage(completeResult.message ?? "Данные сохранены, но не удалось завершить задачу")
        return
      }
      {
        const appended = (saveResult.paths ?? []).map(({ path, bucket, key }) => ({ path, bucket, key }))
        if (appended.length) {
          setExistingPhotos((prev) => [...prev, ...appended])
        }
      }
      setLocalFiles((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.url))
        return []
      })
      setFileInputResetKey((prev) => prev + 1)
      onCompleted?.("done")
      setMessage("Задача завершена")
  })
}

  const handleDeletePhoto = (photo: { path: string; bucket?: string }) => {
    if (isDone) return
    setMessage(null)
    setDeletePending(photo.path)
    startDeleteTransition(async () => {
      const result = await deleteTaskPhoto({ taskId, path: photo.path, bucket: photo.bucket ?? "task-media" })
      if (!result.success) {
        setMessage(result.message ?? "Не удалось удалить фото")
        setDeletePending(null)
        return
      }
      setExistingPhotos((prev) => prev.filter((item) => item.path !== photo.path))
      setDeletePending(null)
    })
  }

  const handleRemoveLocal = (id?: string) => {
    if (isDone) return
    if (!id) return
    setLocalFiles((prev) => {
      const match = prev.find((item) => item.id === id)
      if (match) URL.revokeObjectURL(match.url)
      return prev.filter((item) => item.id !== id)
    })
    setFileInputResetKey((prev) => prev + 1)
  }

  useEffect(() => {
    localFilesRef.current = localFiles
  }, [localFiles])

  useEffect(() => {
    return () => {
      localFilesRef.current.forEach((item) => URL.revokeObjectURL(item.url))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function hydrateUrls() {
      const resolved = await Promise.all(
        existingPhotos.map(async (photo) => {
          const bucket = photo.bucket ?? "task-media"
          try {
            const { data, error } = await supabaseBrowser.storage.from(bucket).createSignedUrl(photo.path, 3600)
            if (error || !data?.signedUrl) {
              const serverSigned = await signTaskPhotoUrl({ bucket, path: photo.path })
              if (serverSigned.success && serverSigned.url) return { ...photo, url: serverSigned.url }
              return { ...photo, url: undefined }
            }
            return { ...photo, url: data.signedUrl }
          } catch {
            const serverSigned = await signTaskPhotoUrl({ bucket, path: photo.path })
            if (serverSigned.success && serverSigned.url) return { ...photo, url: serverSigned.url }
            return { ...photo, url: undefined }
          }
        })
      )
      if (!cancelled) setDisplayPhotos(resolved)
    }
    void hydrateUrls()
    return () => {
      cancelled = true
    }
  }, [existingPhotos])

  if (!normalizedInputs.length) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-white/70">Нет обязательных данных. Нажмите кнопку, чтобы завершить задачу.</p>
        <Button
          type="button"
          disabled={isPending}
          onClick={() => handleSubmit(new FormData())}
          className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
        >
          {isPending ? "Сохраняем…" : "Завершить задачу"}
        </Button>
        {message ? <p className="text-sm text-emerald-100">{message}</p> : null}
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <input type="hidden" name="taskId" value={taskId} />
      <div className="space-y-4">
        {normalizedInputs.map((input) => {
          const labelText = adjustOdometerLabel(input.label, previousOdometer, input.key)
          const fuelLabel = adjustFuelLabel(input.label, input.key)
          const kind: "photos" | "damage" = isDamageKey(input.key) ? "damage" : "photos"
          const hasPhotos =
            (kind === "damage"
              ? displayPhotos.some((p) => isDamageKey(p.key ?? "")) || localFiles.some((f) => f.kind === "damage")
              : displayPhotos.some((p) => !isDamageKey(p.key ?? "")) || localFiles.some((f) => f.kind === "photos")
            )
          const isOdometer = isOdometerKey(input.key)
          const isFuel = isFuelKey(input.key)
          const delta =
            isOdometer && previousOdometer !== undefined && odometerValue !== undefined
              ? formatOdometerDelta(odometerValue, previousOdometer)
              : isFuel && previousFuel !== undefined
                  ? formatFuelDelta(fuelLevel, previousFuel)
                  : null
          const isOdometerField = input.type === "number" && isOdometer
          const isNotesField = input.type === "text" && input.key === "damage_notes"
          const isReturnPhotos = input.type === "file" && kind === "photos"
          const shouldWrapWithCard = !isOdometerField && !isNotesField && !isReturnPhotos
          const fieldLabel = fuelLabel ?? labelText
          const renderFieldContent = () => {
            if (input.type === "number") {
              return (
                <input
                  name="odometer"
                  type="number"
                  inputMode="numeric"
                  required={input.required}
                  min={previousOdometer ?? 0}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/60"
                  placeholder={
                    previousOdometer !== undefined
                      ? `Последнее значение: ${previousOdometer}`
                      : "Например, 25000"
                  }
                  disabled={isDone}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "") {
                      setOdometerValue(undefined)
                    } else {
                      const num = Number(value)
                      if (!Number.isNaN(num)) setOdometerValue(num)
                    }
                  }}
                />
              )
            }
            if (input.type === "select" && input.key.startsWith("fuel")) {
              return (
                <div className="space-y-2">
                  <input
                    type="range"
                    name="fuel_slider"
                    min={0}
                    max={8}
                    step={1}
                    value={fuelLevel}
                    onChange={(e) => setFuelLevel(Number(e.target.value))}
                    className="w-full accent-white"
                    disabled={isDone}
                    aria-label="Fuel level in eighths"
                    required={input.required}
                  />
                  <input type="hidden" name="fuel" value={fuelLevel} />
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/60">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                      <span key={value} className={value === fuelLevel ? "text-white" : undefined}>
                        {value}/8
                      </span>
                    ))}
                  </div>
                </div>
              )
            }
            if (input.type === "select" && !input.key.startsWith("fuel")) {
              return (
                <select
                  name={input.key === "cleaning_needed" ? "cleaning" : input.key}
                  required={input.required}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/60"
                  disabled={isDone}
                >
                  <option value="">Выберите</option>
                  {(input.options ?? ["Full", "3/4", "1/2", "1/4", "Empty"]).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )
            }
            if (input.type === "text") {
              return (
                <textarea
                  name={input.key === "damage_notes" ? "notes" : input.key}
                  required={input.required}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/60"
                  rows={3}
                  placeholder="Добавьте комментарий"
                  disabled={isDone}
                />
              )
            }
            if (input.type === "file") {
              const galleryOptions =
                kind === "damage"
                  ? {}
                  : { frame: "inline" as const, hideTitle: true }
              return (
                <>
                  <input
                    key={`${input.key}-${fileInputResetKey}`}
                    name={input.key.includes("damage") ? "damage_photos" : "photos"}
                    type="file"
                    multiple={input.multiple}
                    accept={input.accept}
                    required={input.required && !hasPhotos}
                    className="block w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/80 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-900 hover:file:bg-white"
                    disabled={isDone}
                    onChange={(event) => {
                      const files = event.target.files
                      if (!files) return
                      const inputName = input.key.includes("damage") ? "damage_photos" : "photos"
                      const kind: "photos" | "damage" = input.key.includes("damage") ? "damage" : "photos"
                      const previews = Array.from(files).map((file, idx) => ({
                        id: `${inputName}-${Date.now()}-${idx}`,
                        url: URL.createObjectURL(file),
                        file,
                        name: inputName,
                        kind,
                      }))
                      setLocalFiles((prev) => [...prev, ...previews])
                    }}
                  />
                  {renderGallerySection(
                    input.label,
                    displayPhotos.filter((p) => (kind === "damage" ? isDamageKey(p.key ?? "") : !isDamageKey(p.key ?? ""))),
                    localFiles.filter((f) => f.kind === kind),
                    {
                      isDone,
                      isDeleting,
                      deletePending,
                      isPending,
                      onRemoveLocal: handleRemoveLocal,
                      onDeleteStored: handleDeletePhoto,
                      ...galleryOptions,
                    }
                  )}
                </>
              )
            }
            return null
          }
          return (
            <div key={input.key} className="space-y-3">
              {input.type === "text" && input.key === "damage_notes" && typeof outstanding === "number" ? (
                <div className="rounded-2xl border border-white/25 bg-white/10 p-4 space-y-3">
                  <div className={sectionHintClass}>Оплата</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 items-center">
                    <div className="text-sm text-white/70">К оплате</div>
                    <div className="text-base font-semibold text-white text-right">{currency} {outstanding.toFixed(2)}</div>
                    <div className="text-sm text-white/80">Получено</div>
                    <div className="flex items-center justify-end">
                      <div className="relative w-40">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/60">{currency}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={paymentInput === undefined ? "" : String(paymentInput)}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            setPaymentInput(Number.isFinite(v) ? v : undefined)
                          }}
                          className="w-full rounded-2xl border border-white/20 bg-white/10 px-10 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-white/60"
                          disabled={isDone}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-white/70">Остаток</div>
                    <div className="text-base font-semibold text-white text-right">{currency} {String(paymentInput ?? 0) && Number.isFinite(Number(paymentInput)) ? Math.max(0, outstanding - Number(paymentInput)).toFixed(2) : outstanding.toFixed(2)}</div>
                  </div>
                  
                  {typeof paymentInput === "number" && paymentInput > outstanding ? (
                    <div className="text-xs text-rose-200">Сумма больше задолженности</div>
                  ) : null}
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className={labelClass}>
                  {fieldLabel}
                  {input.required ? <span className="text-rose-200"> *</span> : null}
                </span>
                {delta ? <span className="text-xs text-white/70">Δ {delta}</span> : null}
              </div>
              {isReturnPhotos ? (
                <div className={returnPhotosCardClass}>
                  {renderFieldContent()}
                </div>
              ) : shouldWrapWithCard ? (
                <div className={`${fieldCardBase} ${input.type === "file" ? "space-y-3" : "space-y-2"}`}>
                  {renderFieldContent()}
                </div>
              ) : (
                renderFieldContent()
              )}
            </div>
          )
        })}
      </div>
      <div className="space-y-2">
        <Button
          type="submit"
          disabled={isPending || isDone}
          className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
        >
          {isPending ? "Сохраняем…" : "Завершить задачу"}
        </Button>
        {message ? <p className="text-sm text-emerald-100">{message}</p> : null}
      </div>
    </form>
  )
}

function isSignatureInput(input: DriverInput) {
  const normalized = `${input?.key ?? ""} ${input?.label ?? ""}`.toLowerCase()
  return normalized.includes("signature")
}

function isCleaningInput(input: DriverInput) {
  const normalized = `${input?.key ?? ""} ${input?.label ?? ""}`.toLowerCase()
  return normalized.includes("cleaning")
}

function isDamageKey(key: string) {
  return key.toLowerCase().includes("damage")
}

function adjustOdometerLabel(label: string, previous?: number, key?: string) {
  const isOdometer = `${label} ${key ?? ""}`.toLowerCase().includes("odo")
  if (!isOdometer) return label
  const base = label.replace(/\(.*(before|after).*?\)/gi, "").trim() || "Odometer"
  const suffix = previous !== undefined ? `(more than ${previous})` : "(more than last value)"
  return `${base} ${suffix}`.trim()
}

function adjustFuelLabel(label: string, key?: string) {
  const isFuel = `${label} ${key ?? ""}`.toLowerCase().includes("fuel")
  if (!isFuel) return null
  const base = label.replace(/\(.*(before|after).*?\)/gi, "").trim() || "Fuel/charge level"
  return base
}

function parseFuelFraction(value?: string | number | null) {
  if (value === null || value === undefined) return undefined
  if (typeof value === "number") return value
  const match = value.match(/(\d+)\s*\/\s*8/)
  if (match) {
    const num = Number(match[1])
    if (Number.isFinite(num)) return Math.max(0, Math.min(8, num))
  }
  return undefined
}

function formatFuelFraction(value: number) {
  const clamped = Math.max(0, Math.min(8, Math.round(value)))
  return `${clamped}/8`
}

function isOdometerKey(key: string) {
  return key.toLowerCase().includes("odo")
}

function isFuelKey(key: string) {
  return key.toLowerCase().includes("fuel")
}

function formatOdometerDelta(current: number, previous: number) {
  const diff = current - previous
  const sign = diff >= 0 ? "+" : ""
  return `${sign}${diff}`
}

function formatFuelDelta(currentSteps: number, previousSteps?: number) {
  if (previousSteps === undefined || Number.isNaN(previousSteps)) return null
  const diff = currentSteps - previousSteps
  if (diff === 0) return null
  const sign = diff >= 0 ? "+" : ""
  return `${sign}${diff}/8`
}

function toPublicStorageUrl(bucket: string, path: string) {
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path
  return ""
}

function renderGallerySection(
  title: string,
  stored: Array<{ path: string; bucket?: string; url?: string; key?: string }>,
  local: Array<{ id: string; url: string; kind: "photos" | "damage"; name?: string }>,
  opts: {
    isDone: boolean
    isDeleting: boolean
    deletePending: string | null
    isPending: boolean
    onRemoveLocal: (id?: string) => void
    onDeleteStored: (photo: { path: string; bucket?: string }) => void
    frame?: "card" | "inline"
    hideTitle?: boolean
  }
) {
  if (!stored.length && !local.length) return null
  const grid = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[
        ...stored.map((photo) => ({ ...photo, local: false, id: undefined })),
        ...local.map((p) => ({ path: p.url, bucket: "local", local: true, id: p.id, url: p.url })),
      ].map((photo) => {
        const publicUrl = photo.url ?? toPublicStorageUrl(photo.bucket ?? "task-media", photo.path)
        return (
          <div
            key={photo.id ?? photo.path}
            className="group relative h-32 overflow-hidden rounded-2xl border border-white/15 bg-white/5"
          >
            {publicUrl ? (
              <Image
                src={publicUrl}
                alt="Task photo"
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-white/60">Нет превью</div>
            )}
            <button
              type="button"
              onClick={() => {
                if (photo.local) {
                  opts.onRemoveLocal(photo.id)
                } else {
                  opts.onDeleteStored(photo)
                }
              }}
              disabled={
                opts.isDone ||
                (!photo.local && (opts.isDeleting || opts.deletePending === photo.path)) ||
                opts.isPending
              }
              className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white transition hover:bg-black/80 disabled:opacity-50"
            >
              {photo.local
                ? "Убрать"
                : opts.deletePending === photo.path
                  ? "Удаляем…"
                  : "Удалить"}
            </button>
          </div>
        )
      })}
    </div>
  )
  const titleElement = opts.hideTitle ? null : (
    <div className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">{title}</div>
  )
  if (opts.frame === "inline") {
    return (
      <div className="space-y-2">
        {titleElement}
        {grid}
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-3 space-y-3">
      {titleElement}
      {grid}
    </div>
  )
}

function normalizePhone(value?: string) {
  if (!value) return undefined
  const digits = value.replace(/\D+/g, "")
  if (!digits.length) return undefined
  return digits
}

function buildMapsUrl(geo?: { pickup?: string; dropoff?: string }) {
  const origin = geo?.pickup?.trim()
  const destination = geo?.dropoff?.trim()
  if (origin && destination) {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
  }
  const query = origin || destination
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  }
  return undefined
}

function buildWhatsAppText(task: Task) {
  const code = task.bookingCode ?? String(task.bookingId ?? "")
  const title = task.vehicleName ?? task.title
  const pickup = task.geo?.pickup ?? ""
  const dropoff = task.geo?.dropoff ?? ""
  const parts = [code ? `#${code}` : "", title || "", pickup && dropoff ? `${pickup} → ${dropoff}` : pickup || dropoff || ""]
  return parts.filter(Boolean).join(" · ")
}
