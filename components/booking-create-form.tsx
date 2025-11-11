"use client"

import { useMemo, useState } from "react"

import { BOOKING_PRIORITIES, BOOKING_TYPES } from "@/lib/constants/bookings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface BookingDraft {
  clientId: string
  carId: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  type: keyof typeof BOOKING_TYPES
  priority: keyof typeof BOOKING_PRIORITIES
  channel: string
  notes: string
}

interface BookingCreateFormProps {
  clients: Array<{ id: string; label: string }>
  vehicles: Array<{ id: string; label: string }>
}

export function BookingCreateForm({ clients, vehicles }: BookingCreateFormProps) {
  const [draft, setDraft] = useState<BookingDraft>(() => ({
    clientId: clients[0]?.id ?? "",
    carId: vehicles[0]?.id ?? "",
    startDate: "2025-10-20",
    startTime: "09:00",
    endDate: "2025-10-22",
    endTime: "18:00",
    type: "vip",
    priority: "high",
    channel: "Manual",
    notes: "",
  }))
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)

  const clientOptions = useMemo(() => clients.map((client) => ({ label: client.label, value: client.id })), [clients])
  const vehicleOptions = useMemo(() => vehicles.map((car) => ({ label: car.label, value: car.id })), [vehicles])

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          setPreview({
            client_id: draft.clientId || null,
            vehicle_id: draft.carId || null,
            period: {
              start: `${draft.startDate}T${draft.startTime}:00Z`,
              end: `${draft.endDate}T${draft.endTime}:00Z`,
            },
            booking_type: draft.type,
            priority: draft.priority,
            channel: draft.channel,
            notes: draft.notes || null,
          })
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="booking-client">Client</Label>
          <Select value={draft.clientId} onValueChange={(value) => setDraft((prev) => ({ ...prev, clientId: value }))}>
            <SelectTrigger id="booking-client">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clientOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="booking-vehicle">Vehicle</Label>
          <Select value={draft.carId} onValueChange={(value) => setDraft((prev) => ({ ...prev, carId: value }))}>
            <SelectTrigger id="booking-vehicle">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="booking-start-date">Start date</Label>
          <Input
            id="booking-start-date"
            type="date"
            value={draft.startDate}
            onChange={(event) => setDraft((prev) => ({ ...prev, startDate: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="booking-start-time">Start time</Label>
          <Input
            id="booking-start-time"
            type="time"
            value={draft.startTime}
            onChange={(event) => setDraft((prev) => ({ ...prev, startTime: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="booking-end-date">End date</Label>
          <Input
            id="booking-end-date"
            type="date"
            value={draft.endDate}
            onChange={(event) => setDraft((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="booking-end-time">End time</Label>
          <Input
            id="booking-end-time"
            type="time"
            value={draft.endTime}
            onChange={(event) => setDraft((prev) => ({ ...prev, endTime: event.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="booking-type">Booking type</Label>
          <Select value={draft.type} onValueChange={(value) => setDraft((prev) => ({ ...prev, type: value as BookingDraft["type"] }))}>
            <SelectTrigger id="booking-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(BOOKING_TYPES) as BookingDraft["type"][]).map((type) => (
                <SelectItem key={type} value={type}>
                  {BOOKING_TYPES[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="booking-priority">Priority</Label>
          <Select
            value={draft.priority}
            onValueChange={(value) => setDraft((prev) => ({ ...prev, priority: value as BookingDraft["priority"] }))}
          >
            <SelectTrigger id="booking-priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(BOOKING_PRIORITIES) as BookingDraft["priority"][]).map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {BOOKING_PRIORITIES[priority].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="booking-channel">Channel</Label>
          <Input
            id="booking-channel"
            value={draft.channel}
            onChange={(event) => setDraft((prev) => ({ ...prev, channel: event.target.value }))}
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="booking-notes">Notes</Label>
          <Input
            id="booking-notes"
            placeholder="Special requests, concierge notes, etc."
            value={draft.notes}
            onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </div>
        <div className="md:col-span-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Submitting builds a JSON preview; persistence still happens through Supabase workflows.</p>
          <Button type="submit">Preview payload</Button>
        </div>
      </form>

      {preview ? (
        <Card className="rounded-[28px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Preview payload</CardTitle>
            <CardDescription>Copy into automation script or MCP SQL runner.</CardDescription>
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
