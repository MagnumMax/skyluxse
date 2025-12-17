"use client"

import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import type { VehicleMaintenanceEntry } from "@/lib/domain/entities"
import { addDays } from "date-fns"
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react"
import { formatDateTime, toDubaiDate } from "@/lib/formatters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"

type VehicleServiceManagerProps = {
  vehicleId: string
  services: VehicleMaintenanceEntry[]
}

type ServiceDraft = {
  type: "maintenance" | "repair"
  location: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  notes: string
}

type ServiceUpdatePayload = {
  type?: "maintenance" | "repair"
  location?: string
  plannedStart?: string
  plannedEnd?: string
  notes?: string
}

export function VehicleServiceManager({ vehicleId, services: initialServices }: VehicleServiceManagerProps) {
  const { toast } = useToast()
  const [services, setServices] = useState<VehicleMaintenanceEntry[]>(() => sortServices(initialServices))
  const [draft, setDraft] = useState<ServiceDraft>(() => buildDefaultDraft())
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    const payload = buildPayloadFromDraft(draft)
    if (!payload) {
      toast({ title: "Check the dates", description: "Planned start must be before end.", variant: "destructive" })
      return
    }
    setSubmitting(true)
    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setSubmitting(false)
    if (!response.ok) {
      const message = await readError(response)
      toast({ title: "Failed to add service", description: message ?? undefined, variant: "destructive" })
      return
    }
    const data = (await response.json()) as { services?: VehicleMaintenanceEntry[] }
    if (data.services) {
      setServices(sortServices(data.services))
    }
    setDraft(buildDefaultDraft())
    toast({ title: "Service saved", description: "Maintenance/repair window created." })
  }

  const handleUpdate = async (serviceId: string, payload: ServiceUpdatePayload) => {
    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/services/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const message = await readError(response)
      toast({ title: "Failed to update service", description: message ?? undefined, variant: "destructive" })
      throw new Error(message ?? "Update failed")
    }
    const data = (await response.json()) as { services?: VehicleMaintenanceEntry[] }
    if (data.services) {
      setServices(sortServices(data.services))
    }
    toast({ title: "Service updated" })
  }

  const handleDelete = async (serviceId: string) => {
    const confirmDelete = window.confirm("Delete this service and its documents?")
    if (!confirmDelete) return
    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/services/${serviceId}`, { method: "DELETE" })
    if (!response.ok) {
      const message = await readError(response)
      toast({ title: "Failed to delete service", description: message ?? undefined, variant: "destructive" })
      return
    }
    const data = (await response.json()) as { services?: VehicleMaintenanceEntry[] }
    if (data.services) {
      setServices(sortServices(data.services))
    }
    toast({ title: "Service deleted" })
  }

  const handleUploadDocument = async (serviceId: string, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/services/${serviceId}/documents`, {
      method: "POST",
      body: formData,
    })
    if (!response.ok) {
      const message = await readError(response)
      toast({ title: "Failed to upload document", description: message ?? undefined, variant: "destructive" })
      throw new Error(message ?? "Upload failed")
    }
    const data = (await response.json()) as { services?: VehicleMaintenanceEntry[] }
    if (data.services) {
      setServices(sortServices(data.services))
    }
    toast({ title: "Document added" })
  }

  const handleDeleteDocument = async (serviceId: string, documentId: string) => {
    const response = await fetch(
      `/api/fleet/vehicles/${vehicleId}/services/${serviceId}/documents/${documentId}`,
      { method: "DELETE" }
    )
    if (!response.ok) {
      const message = await readError(response)
      toast({ title: "Failed to delete document", description: message ?? undefined, variant: "destructive" })
      throw new Error(message ?? "Delete failed")
    }
    const data = (await response.json()) as { services?: VehicleMaintenanceEntry[] }
    if (data.services) {
      setServices(sortServices(data.services))
    }
    toast({ title: "Document deleted" })
  }

  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Service</CardTitle>
        <CardDescription>Schedule maintenance or repair and attach documents.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4" onSubmit={handleCreate}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Type</Label>
              <Select
                value={draft.type}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, type: value as ServiceDraft["type"] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Location</Label>
              <Input
                value={draft.location}
                onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="Workshop or address"
                required
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Planned start (date)</Label>
                <Input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => setDraft((prev) => ({ ...prev, startDate: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Planned start (time)</Label>
                <Input
                  type="time"
                  value={draft.startTime}
                  onChange={(event) => setDraft((prev) => ({ ...prev, startTime: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Planned end (date)</Label>
                <Input
                  type="date"
                  value={draft.endDate}
                  onChange={(event) => setDraft((prev) => ({ ...prev, endDate: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Planned end (time)</Label>
                <Input
                  type="time"
                  value={draft.endTime}
                  onChange={(event) => setDraft((prev) => ({ ...prev, endTime: event.target.value }))}
                  required
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Notes</Label>
            <Textarea
              value={draft.notes}
              onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Optional description or checklist"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Created services will block bookings between the planned dates.</p>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Add service"}
            </Button>
          </div>
        </form>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Current services</p>
          {services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground">
              No maintenance/repair windows yet.
            </div>
          ) : (
            services.map((service) => (
              <ServiceItem
                key={service.id}
                service={service}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onUpload={handleUploadDocument}
                onDeleteDocument={handleDeleteDocument}
              />
            ))
          )}
        </section>
      </CardContent>
    </Card>
  )
}

function ServiceItem({
  service,
  onUpdate,
  onDelete,
  onUpload,
  onDeleteDocument,
}: {
  service: VehicleMaintenanceEntry
  onUpdate: (serviceId: string, payload: ServiceUpdatePayload) => Promise<void>
  onDelete: (serviceId: string) => Promise<void>
  onUpload: (serviceId: string, file: File) => Promise<void>
  onDeleteDocument: (serviceId: string, documentId: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [draft, setDraft] = useState<ServiceDraft>(() => buildDraftFromService(service))

  useEffect(() => {
    setDraft(buildDraftFromService(service))
  }, [service])

  const plannedRange = useMemo(() => {
    return `${formatDateTime(service.plannedStart ?? service.date)} → ${formatDateTime(
      service.plannedEnd ?? service.plannedStart ?? service.date
    )}`
  }, [service])

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    const payload = buildPayloadFromDraft(draft)
    if (!payload) {
      window.alert("Check planned dates for this service.")
      return
    }
    setSaving(true)
    try {
      await onUpdate(service.id, payload)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    try {
      await onUpload(service.id, file)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="uppercase tracking-[0.2em]">
              {service.type}
            </Badge>
            <span className="text-sm font-semibold text-foreground">{service.location ?? "Location not set"}</span>
          </div>
          <p className="text-sm text-muted-foreground">{plannedRange}</p>
          {service.notes ? <p className="text-xs text-muted-foreground">{service.notes}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing((prev) => !prev)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => onDelete(service.id)}>
            Delete
          </Button>
        </div>
      </div>

      {editing ? (
        <form className="space-y-3 rounded-xl border border-border/50 bg-card/50 p-3" onSubmit={handleSave}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Type</Label>
              <Select
                value={draft.type}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, type: value as ServiceDraft["type"] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Location</Label>
              <Input value={draft.location} onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Planned start (date)</Label>
                <Input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => setDraft((prev) => ({ ...prev, startDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Planned start (time)</Label>
                <Input
                  type="time"
                  value={draft.startTime}
                  onChange={(event) => setDraft((prev) => ({ ...prev, startTime: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Planned end (date)</Label>
                <Input
                  type="date"
                  value={draft.endDate}
                  onChange={(event) => setDraft((prev) => ({ ...prev, endDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Planned end (time)</Label>
                <Input
                  type="time"
                  value={draft.endTime}
                  onChange={(event) => setDraft((prev) => ({ ...prev, endTime: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Notes</Label>
            <Textarea
              value={draft.notes}
              onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Optional description or checklist"
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Documents</p>
          <label className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
            <input
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                void handleUpload(file)
                event.target.value = ""
              }}
              disabled={uploading}
            />
            {uploading ? "Uploading…" : "Upload"}
          </label>
        </div>
        <div className="space-y-2">
          {(service.documents ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground">No documents</div>
          ) : (
            (service.documents ?? []).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                      {doc.name ?? doc.type}
                    </a>
                  ) : (
                    <span className="font-semibold text-foreground">{doc.name ?? doc.type}</span>
                  )}
                  <Badge variant="outline">{doc.type}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onDeleteDocument(service.id, doc.id)}>
                  Delete
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function buildDefaultDraft(): ServiceDraft {
  const now = new Date()
  const defaultStart = toDateInput(now)
  const defaultEnd = defaultStart
  return {
    type: "maintenance",
    location: "",
    startDate: defaultStart,
    startTime: toTimeInput(now),
    endDate: defaultEnd,
    endTime: "18:00",
    notes: "",
  }
}

function buildDraftFromService(service: VehicleMaintenanceEntry): ServiceDraft {
  const start = service.plannedStart ?? service.date
  const end = service.plannedEnd ?? service.plannedStart ?? service.date
  return {
    type: (service.type as ServiceDraft["type"]) || "maintenance",
    location: service.location ?? "",
    startDate: toDateInput(start ? new Date(start) : new Date()),
    startTime: toTimeInput(start ? new Date(start) : new Date()),
    endDate: toDateInput(end ? new Date(end) : new Date()),
    endTime: toTimeInput(end ? new Date(end) : new Date()),
    notes: service.notes ?? "",
  }
}

function buildPayloadFromDraft(draft: ServiceDraft): ServiceUpdatePayload | null {
  const plannedStart = combineDateTime(draft.startDate, draft.startTime)
  const plannedEnd = combineDateTime(draft.endDate, draft.endTime)
  if (!plannedStart || !plannedEnd) return null
  if (new Date(plannedStart).getTime() > new Date(plannedEnd).getTime()) return null
  return {
    type: draft.type,
    location: draft.location.trim(),
    plannedStart,
    plannedEnd,
    notes: draft.notes.trim() || undefined,
  }
}

function combineDateTime(date: string, time: string) {
  if (!date) return null
  const normalizedTime = time || "00:00"
  // Interpret as Dubai time (+04:00)
  const parsed = new Date(`${date}T${normalizedTime}:00+04:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function toDateInput(value: Date) {
  const dubaiDate = toDubaiDate(value)
  const year = dubaiDate.getFullYear()
  const month = `${dubaiDate.getMonth() + 1}`.padStart(2, "0")
  const day = `${dubaiDate.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function toTimeInput(value: Date) {
  const dubaiDate = toDubaiDate(value)
  const hours = `${dubaiDate.getHours()}`.padStart(2, "0")
  const minutes = `${dubaiDate.getMinutes()}`.padStart(2, "0")
  return `${hours}:${minutes}`
}

function sortServices(entries: VehicleMaintenanceEntry[]) {
  return [...entries].sort((a, b) => {
    const aDate = dateValue(a.plannedStart ?? a.date)
    const bDate = dateValue(b.plannedStart ?? b.date)
    return bDate - aDate
  })
}

function dateValue(value?: string) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

async function readError(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { error?: string }
    return data.error ?? null
  } catch {
    return null
  }
}
