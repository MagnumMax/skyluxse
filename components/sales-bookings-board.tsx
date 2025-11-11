"use client"

import { forwardRef, useMemo, useState } from "react"
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvidedDragHandleProps,
  type DraggableProvidedDraggableProps,
  type DropResult,
} from "@hello-pangea/dnd"

import type { Booking, BookingStatus, Driver } from "@/lib/domain/entities"
import { BOOKING_PRIORITIES, BOOKING_TYPES, KANBAN_STATUS_META } from "@/lib/constants/bookings"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const statusOrder: BookingStatus[] = ["new", "preparation", "delivery", "in-rent", "settlement"]

type SalesBookingsBoardProps = {
  bookings: Booking[]
  drivers: Driver[]
  readOnly?: boolean
}

export function SalesBookingsBoard({ bookings, drivers, readOnly = false }: SalesBookingsBoardProps) {
  const [boardBookings, setBoardBookings] = useState<Booking[]>(bookings)
  const [activityLog, setActivityLog] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [driverFilter, setDriverFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = useMemo(() => {
    return boardBookings.filter((booking) => {
      if (typeFilter !== "all" && booking.type !== typeFilter) {
        return false
      }
      if (driverFilter === "unassigned" && booking.driverId) {
        return false
      }
      if (driverFilter !== "all" && driverFilter !== "unassigned") {
        if (booking.driverId?.toString() !== driverFilter) {
          return false
        }
      }
      if (searchTerm.trim()) {
        const haystack = [
          booking.code,
          booking.clientName,
          booking.carName,
          booking.channel,
          booking.segment,
          booking.tags?.join(" ") ?? "",
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(searchTerm.toLowerCase())) {
          return false
        }
      }
      return true
    })
  }, [boardBookings, driverFilter, searchTerm, typeFilter])

  const grouped = useMemo(() => {
    return statusOrder.reduce<Record<BookingStatus, Booking[]>>((acc, status) => {
      acc[status] = filtered.filter((booking) => booking.status === status)
      return acc
    }, { new: [], preparation: [], delivery: [], "in-rent": [], settlement: [] })
  }, [filtered])

  const uniqueTypes = useMemo(() => {
    const set = new Set<Booking["type"]>()
    boardBookings.forEach((booking) => set.add(booking.type))
    return Array.from(set)
  }, [boardBookings])

  const handleDragEnd = (result: DropResult) => {
    if (readOnly) return
    const { destination, source, draggableId } = result
    if (!destination) return

    const sourceStatus = source.droppableId as BookingStatus
    const targetStatus = destination.droppableId as BookingStatus
    const bookingId = draggableId
    if (sourceStatus === targetStatus && source.index === destination.index) return

    setBoardBookings((prev) => {
      return prev.map((booking) => {
        if (String(booking.id) !== bookingId) return booking
        const { updatedBooking } = applyAutomations(booking, targetStatus, drivers)
        return updatedBooking
      })
    })

    const booking = boardBookings.find((item) => String(item.id) === bookingId)
    const statusLabel = KANBAN_STATUS_META[targetStatus].label
    const entry = booking ? `${booking.code} → ${statusLabel}` : `Booking ${bookingId} → ${statusLabel}`
    setActivityLog((prev) => [entry, ...prev].slice(0, 6))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label htmlFor="kanban-filter-type">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger id="kanban-filter-type" className="w-[180px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {BOOKING_TYPES[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="kanban-filter-driver">Driver</Label>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger id="kanban-filter-driver" className="w-[200px]">
                <SelectValue placeholder="All drivers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All drivers</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id.toString()}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1 min-w-[200px]">
            <Label htmlFor="kanban-search">Search</Label>
            <Input
              id="kanban-search"
              placeholder="Search booking, client, vehicle"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTypeFilter("all")
                setDriverFilter("all")
                setSearchTerm("")
              }}
            >
              Reset filters
            </Button>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-4 lg:grid-cols-5">
          {statusOrder.map((status) => {
            const meta = KANBAN_STATUS_META[status]
            const columnBookings = grouped[status]
            return (
              <Droppable droppableId={status} key={status}>
                {(provided) => (
                  <section
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-col rounded-2xl border border-border/70 bg-background"
                  >
                    <header className={cn("border-b px-4 py-3", meta.accentBorder, meta.accent)}>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">{meta.group}</p>
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-slate-900">{meta.label}</h2>
                        <span className="text-sm text-muted-foreground">{columnBookings.length}</span>
                      </div>
                      <p className="text-xs text-slate-600/80">{meta.description}</p>
                    </header>
                    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                      {columnBookings.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
                          No bookings in this stage
                        </p>
                      ) : (
                        columnBookings.map((booking, index) => (
                          <Draggable
                            draggableId={booking.id.toString()}
                            index={index}
                            key={booking.id}
                            isDragDisabled={readOnly}
                          >
                            {(dragProvided, snapshot) => (
                              <KanbanCard
                                ref={dragProvided.innerRef}
                                booking={booking}
                                drivers={drivers}
                                draggableProps={dragProvided.draggableProps}
                                dragHandleProps={readOnly ? null : dragProvided.dragHandleProps}
                                isDragging={snapshot.isDragging && !readOnly}
                              />
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  </section>
                )}
              </Droppable>
            )
          })}
        </div>
      </DragDropContext>

      {!readOnly && activityLog.length ? (
        <section className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Activity</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {activityLog.map((entry, index) => (
              <li key={index} className="rounded-lg bg-background px-3 py-2 text-foreground">
                {entry}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

const datelikeFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
})

const timeFormatter = new Intl.DateTimeFormat("en-CA", {
  hour: "2-digit",
  minute: "2-digit",
})

const applyAutomations = (booking: Booking, targetStatus: BookingStatus, drivers: Driver[]) => {
  const updatedBooking: Booking = { ...booking, status: targetStatus }

  if (targetStatus === "preparation" && !booking.driverId) {
    const fallbackDriver = drivers.find((driver) => driver.status === "Available") ?? drivers[0]
    if (fallbackDriver) {
      updatedBooking.driverId = fallbackDriver.id
    }
  }

  if (targetStatus === "delivery" && !booking.targetTime) {
    updatedBooking.targetTime = Date.now() + 2 * 60 * 60 * 1000
  }

  if (targetStatus === "settlement") {
    updatedBooking.targetTime = null
  }

  return { updatedBooking }
}

type KanbanCardProps = {
  booking: Booking
  drivers: Driver[]
  draggableProps: DraggableProvidedDraggableProps
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined
  isDragging: boolean
}

const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ booking, drivers, dragHandleProps, draggableProps, isDragging }, ref) => {
  const outstanding = Math.max(booking.totalAmount - booking.paidAmount, 0)
  const driverLabel = booking.driverId ? drivers.find((driver) => driver.id === booking.driverId)?.name : null
  const priorityMeta = BOOKING_PRIORITIES[booking.priority]
  const typeLabel = BOOKING_TYPES[booking.type]
  const dateRange = `${datelikeFormatter.format(new Date(booking.startDate))} – ${datelikeFormatter.format(
    new Date(booking.endDate)
  )}`
  const targetTime = booking.targetTime ? timeFormatter.format(new Date(booking.targetTime)) : null
  return (
    <article
      ref={ref}
      {...draggableProps}
      {...dragHandleProps}
      className={cn(
        "space-y-3 rounded-2xl border border-border bg-card/80 p-4 shadow-sm transition",
        isDragging && "ring-2 ring-primary shadow-lg"
      )}
      data-booking-id={booking.id}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{booking.code}</p>
          <p className="text-sm font-semibold text-foreground">{booking.carName}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <span className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {typeLabel}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", priorityMeta.className)}>{priorityMeta.label}</span>
        </div>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Client:</span> {booking.clientName}
        </p>
        <p>
          <span className="font-medium text-foreground">Period:</span> {dateRange}
        </p>
        {booking.pickupLocation ? (
          <p>
            <span className="font-medium text-foreground">Route:</span> {booking.pickupLocation}
            {booking.dropoffLocation ? ` → ${booking.dropoffLocation}` : ""}
          </p>
        ) : null}
        <p>
          <span className="font-medium text-foreground">Owner:</span> {formatOwnerLabel(booking)}
        </p>
        <p>
          <span className="font-medium text-foreground">Driver:</span> {driverLabel ?? "Not assigned"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          Outstanding: {outstanding ? `AED ${outstanding.toLocaleString()}` : "0"}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Deposit: AED {booking.deposit.toLocaleString()}</span>
        {targetTime ? <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-700">ETA {targetTime}</span> : null}
      </div>
      {booking.tags?.length ? (
        <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
          {booking.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-muted px-2 py-0.5">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
  }
)

KanbanCard.displayName = "KanbanCard"

function formatOwnerLabel(booking: Booking) {
  if (booking.ownerName) {
    return booking.ownerName
  }
  const raw = booking.ownerId?.toString() ?? "Unassigned"
  if (raw.length <= 8) {
    return raw.toUpperCase()
  }
  return `${raw.slice(0, 4).toUpperCase()}…`
}
