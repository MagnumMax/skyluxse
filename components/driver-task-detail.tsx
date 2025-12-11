"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"

import { completeTask, deleteTaskPhoto, signTaskPhotoUrl, submitTaskInputs } from "@/app/(driver)/driver/tasks/actions"
import { DriverTaskCard } from "@/components/driver-task-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Task } from "@/lib/domain/entities"
import { supabaseBrowser } from "@/lib/supabase/browser-client"

import { taskTypeLabels } from "./driver-task-card"

type DriverInput = NonNullable<Task["requiredInputs"]>[number]

export function DriverTaskDetail({ task }: { task: Task }) {
  const [status, setStatus] = useState<Task["status"]>(task.status)
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
  const details = [
    { label: "Type", value: taskTypeLabels[task.type] },
    { label: "Deadline", value: task.deadline },
    { label: "Priority", value: task.priority },
    task.bookingId ? { label: "Booking", value: `#${task.bookingCode ?? task.bookingId}` } : undefined,
  ].filter(Boolean) as { label: string; value: string }[]
  const taskWithLiveStatus = { ...task, status } as Task
  const isDone = status === "done"

  return (
    <div className="space-y-6 text-white">
      <Button
        asChild
        variant="outline"
        className="w-fit rounded-full border-white/25 bg-white/5 px-4 py-2 text-white hover:border-white/40 hover:bg-white/10"
      >
        <Link href="/driver/tasks">← Назад к списку</Link>
      </Button>

      <DriverTaskCard task={taskWithLiveStatus} clickable={false} showEta={false}>
        <dl className="grid gap-3 text-sm text-white/80">
          {details.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <dt className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">{item.label}</dt>
              <dd className="text-base font-semibold text-white">{item.value}</dd>
            </div>
          ))}
        </dl>
        {task.geo ? (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/70">
            {task.geo.pickup ? (
              <Badge variant="outline" className="border-white/25 bg-white/5 text-white">
                Pickup · {task.geo.pickup}
              </Badge>
            ) : null}
            {task.geo.dropoff ? (
              <Badge variant="outline" className="border-white/25 bg-white/5 text-white">
                Drop-off · {task.geo.dropoff}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </DriverTaskCard>

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
}

function DriverTaskInputs({
  taskId,
  inputs,
  previousOdometer,
  previousFuel,
  photos = [],
  isDone = false,
  onCompleted,
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
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="taskId" value={taskId} />
      {normalizedInputs.map((input) => {
        const labelText = adjustOdometerLabel(input.label, previousOdometer, input.key)
        const fuelLabel = adjustFuelLabel(input.label, input.key)
        const kind: "photos" | "damage" = isDamageKey(input.key) ? "damage" : "photos"
        const hasPhotos =
          (kind === "damage"
            ? displayPhotos.some((p) => isDamageKey(p.key ?? "")) || localFiles.some((f) => f.kind === "damage")
            : displayPhotos.some((p) => !isDamageKey(p.key ?? "")) || localFiles.some((f) => f.kind === "photos"))
        const isOdometer = isOdometerKey(input.key)
        const isFuel = isFuelKey(input.key)
        const delta =
          isOdometer && previousOdometer !== undefined && odometerValue !== undefined
            ? formatOdometerDelta(odometerValue, previousOdometer)
            : isFuel && previousFuel !== undefined
                ? formatFuelDelta(fuelLevel, previousFuel)
                : null
        return (
          <div key={input.key} className="space-y-2">
            <label className="flex items-center justify-between text-sm font-semibold text-white/90">
              <span>
                {fuelLabel ?? labelText}
                {input.required ? <span className="text-rose-200"> *</span> : null}
              </span>
              {delta ? <span className="text-xs text-white/70">Δ {delta}</span> : null}
            </label>
            {input.type === "number" ? (
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
            ) : null}
            {input.type === "select" && input.key.startsWith("fuel") ? (
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
            ) : null}
            {input.type === "select" && !input.key.startsWith("fuel") ? (
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
            ) : null}
            {input.type === "text" ? (
            <textarea
              name={input.key === "damage_notes" ? "notes" : input.key}
              required={input.required}
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/60"
              rows={3}
              placeholder="Добавьте комментарий"
              disabled={isDone}
            />
            ) : null}
            {input.type === "file" ? (
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
                  kind === "damage" ? "Damage photos" : "Return photos",
                  displayPhotos.filter((p) => (kind === "damage" ? isDamageKey(p.key ?? "") : !isDamageKey(p.key ?? ""))),
                  localFiles.filter((f) => f.kind === kind),
                  {
                    isDone,
                    isDeleting,
                    deletePending,
                    isPending,
                    onRemoveLocal: handleRemoveLocal,
                    onDeleteStored: handleDeletePhoto,
                  }
                )}
              </>
            ) : null}
          </div>
        )
      })}
      <Button
        type="submit"
        disabled={isPending || isDone}
        className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
      >
        {isPending ? "Сохраняем…" : "Завершить задачу"}
      </Button>
      {message ? <p className="text-sm text-emerald-100">{message}</p> : null}
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
  }
) {
  if (!stored.length && !local.length) return null
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-white/80">{title}</div>
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
    </div>
  )
}
