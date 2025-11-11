"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MaintenanceDraft {
  carId: string
  jobType: "maintenance" | "repair"
  vendor: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  checklist: Record<string, boolean>
}

interface MaintenanceAutomationFormProps {
  vehicles: Array<{ id: string; label: string }>
}

const checklistLabels: Record<string, string> = {
  diagnostics: "Diagnostics & health check",
  detailing: "Detailing add-on",
  documents: "Docs/insurance upload",
}

export function MaintenanceAutomationForm({ vehicles }: MaintenanceAutomationFormProps) {
  const [draft, setDraft] = useState<MaintenanceDraft>(() => ({
    carId: vehicles[0]?.id ?? "",
    jobType: "maintenance",
    vendor: "SkyLuxse Service Center",
    startDate: "2025-10-18",
    startTime: "08:00",
    endDate: "2025-10-18",
    endTime: "18:00",
    checklist: {
      diagnostics: true,
      detailing: false,
      documents: false,
    },
  }))
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          setPreview({
            vehicle_id: draft.carId || null,
            job_type: draft.jobType,
            vendor: draft.vendor,
            window: {
              start: `${draft.startDate}T${draft.startTime}:00Z`,
              end: `${draft.endDate}T${draft.endTime}:00Z`,
            },
            checklist: Object.entries(draft.checklist)
              .filter(([, enabled]) => enabled)
              .map(([key]) => key),
          })
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="maintenance-vehicle">Vehicle</Label>
          <Select value={draft.carId} onValueChange={(value) => setDraft((prev) => ({ ...prev, carId: value }))}>
            <SelectTrigger id="maintenance-vehicle">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((car) => (
                <SelectItem key={car.id} value={car.id}>
                  {car.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="maintenance-type">Job type</Label>
          <Select value={draft.jobType} onValueChange={(value: MaintenanceDraft["jobType"]) => setDraft((prev) => ({ ...prev, jobType: value }))}>
            <SelectTrigger id="maintenance-type">
              <SelectValue placeholder="Maintenance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="repair">Repair</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="maintenance-vendor">Vendor</Label>
          <Input
            id="maintenance-vendor"
            value={draft.vendor}
            onChange={(event) => setDraft((prev) => ({ ...prev, vendor: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="maintenance-start-date">Start date</Label>
          <Input
            id="maintenance-start-date"
            type="date"
            value={draft.startDate}
            onChange={(event) => setDraft((prev) => ({ ...prev, startDate: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="maintenance-start-time">Start time</Label>
          <Input
            id="maintenance-start-time"
            type="time"
            value={draft.startTime}
            onChange={(event) => setDraft((prev) => ({ ...prev, startTime: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="maintenance-end-date">End date</Label>
          <Input
            id="maintenance-end-date"
            type="date"
            value={draft.endDate}
            onChange={(event) => setDraft((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="maintenance-end-time">End time</Label>
          <Input
            id="maintenance-end-time"
            type="time"
            value={draft.endTime}
            onChange={(event) => setDraft((prev) => ({ ...prev, endTime: event.target.value }))}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <p className="text-sm font-semibold text-foreground">Automation checklist</p>
          <div className="grid gap-2 md:grid-cols-3">
            {Object.entries(checklistLabels).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={draft.checklist[key]}
                  onCheckedChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      checklist: { ...prev.checklist, [key]: Boolean(value) },
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Submitting generates the payload used by the automation Edge Function.</p>
          <Button type="submit">Preview automation payload</Button>
        </div>
      </form>

      {preview ? (
        <Card className="rounded-[28px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Preview payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-72 overflow-auto rounded-lg border border-border/60 bg-background p-4 text-xs">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
