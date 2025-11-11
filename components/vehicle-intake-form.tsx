"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface VehicleIntakeDraft {
  name: string
  plateNumber: string
  vin: string
  kommoVehicleId: string
  modelYear: string
  exteriorColor: string
  interiorColor: string
}

const defaultDraft: VehicleIntakeDraft = {
  name: "",
  plateNumber: "",
  vin: "",
  kommoVehicleId: "",
  modelYear: "2024",
  exteriorColor: "",
  interiorColor: "",
}

export function VehicleIntakeForm() {
  const [draft, setDraft] = useState<VehicleIntakeDraft>(defaultDraft)
  const [submitted, setSubmitted] = useState<VehicleIntakeDraft | null>(null)

  const previewRecord = useMemo(() => {
    if (!submitted) return null
    return {
      name: submitted.name,
      plate_number: submitted.plateNumber,
      vin: submitted.vin || null,
      kommo_vehicle_id: submitted.kommoVehicleId || null,
      model_year: submitted.modelYear ? Number(submitted.modelYear) : null,
      exterior_color: submitted.exteriorColor || null,
      interior_color: submitted.interiorColor || null,
    }
  }, [submitted])

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(draft)
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="vehicle-name">Display name</Label>
          <Input
            id="vehicle-name"
            placeholder="Mercedes G63 AMG"
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vehicle-plate">Plate number</Label>
          <Input
            id="vehicle-plate"
            placeholder="Z32005"
            value={draft.plateNumber}
            onChange={(event) => setDraft((prev) => ({ ...prev, plateNumber: event.target.value.toUpperCase() }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vehicle-vin">VIN</Label>
          <Input
            id="vehicle-vin"
            placeholder="WA1ZZZF12ND019208"
            value={draft.vin}
            maxLength={17}
            onChange={(event) => setDraft((prev) => ({ ...prev, vin: event.target.value.toUpperCase() }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vehicle-kommo">Kommo vehicle ID</Label>
          <Input
            id="vehicle-kommo"
            placeholder="958555"
            value={draft.kommoVehicleId}
            onChange={(event) => setDraft((prev) => ({ ...prev, kommoVehicleId: event.target.value.replace(/[^0-9]/g, "") }))}
          />
          <p className="text-xs text-muted-foreground">
            Select the Kommo option once and future webhook payloads will be auto-linked through this identifier.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="vehicle-model-year">Model year</Label>
          <Input
            id="vehicle-model-year"
            type="number"
            min="1980"
            max="2100"
            value={draft.modelYear}
            onChange={(event) => setDraft((prev) => ({ ...prev, modelYear: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vehicle-exterior">Exterior colour</Label>
          <Input
            id="vehicle-exterior"
            placeholder="Mango Blue"
            value={draft.exteriorColor}
            onChange={(event) => setDraft((prev) => ({ ...prev, exteriorColor: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vehicle-interior">Interior colour</Label>
          <Input
            id="vehicle-interior"
            placeholder="White"
            value={draft.interiorColor}
            onChange={(event) => setDraft((prev) => ({ ...prev, interiorColor: event.target.value }))}
          />
        </div>
        <div className="md:col-span-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Submitting here only builds a preview payload; Supabase writes still happen through the scripted importer or MCP SQL.
          </p>
          <Button type="submit">Build preview payload</Button>
        </div>
      </form>

      {previewRecord ? (
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground">Preview payload</p>
            <p className="text-xs text-muted-foreground">
              Copy this object into `docs/schemas/vehicle-import.json` or ship it through the MCP SQL importer when ready.
            </p>
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg border border-border/60 bg-background p-4 text-xs">
            {JSON.stringify(previewRecord, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
