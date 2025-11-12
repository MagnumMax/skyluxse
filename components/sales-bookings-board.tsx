"use client"

import { forwardRef, useMemo, useState } from "react"
import type { KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvidedDragHandleProps,
  type DraggableProvidedDraggableProps,
  type DropResult,
} from "@hello-pangea/dnd"

import type { Booking, Driver } from "@/lib/domain/entities"
import {
  BOOKING_TYPES,
  FALLBACK_KOMMO_STAGE_META,
  KOMMO_PIPELINE_STAGE_META,
  KOMMO_PIPELINE_STAGE_ORDER,
  type KommoPipelineStageId,
} from "@/lib/constants/bookings"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type StageBucketId = KommoPipelineStageId | "fallback"

const stageOrder = KOMMO_PIPELINE_STAGE_ORDER
type RouterPushInput = Parameters<ReturnType<typeof useRouter>["push"]>[0]

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
    const initialEntries = [...stageOrder, "fallback" as const].map((stageId) => [stageId, [] as Booking[]])
    const buckets = Object.fromEntries(initialEntries) as Record<StageBucketId, Booking[]>

    filtered.forEach((booking) => {
      const key = normalizeStageId(booking.kommoStatusId)
      buckets[key].push(booking)
    })

    return buckets
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

    const sourceStage = source.droppableId as StageBucketId
    const targetStage = destination.droppableId as StageBucketId
    const bookingId = draggableId
    if (sourceStage === targetStage && source.index === destination.index) return
    if (targetStage === "fallback") return

    setBoardBookings((prev) => {
      return prev.map((booking) => {
        if (String(booking.id) !== bookingId) return booking
        const { updatedBooking } = applyAutomations(booking, targetStage, drivers)
        return updatedBooking
      })
    })

    const booking = boardBookings.find((item) => String(item.id) === bookingId)
    const stageMeta = resolveStageMeta(targetStage)
    const entry = booking
      ? `${booking.code} → ${stageMeta.label}`
      : `Booking ${bookingId} → ${stageMeta.label}`
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
          {([...stageOrder, ...(grouped.fallback.length ? ["fallback" as const] : [])] as StageBucketId[]).map((stageId) => {
            const meta = resolveStageMeta(stageId)
            const columnBookings = grouped[stageId]
            return (
              <Droppable
                droppableId={stageId}
                key={stageId}
                isDropDisabled={stageId === "fallback"}
              >
                {(provided) => (
                  <section
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-col rounded-2xl border border-border/70 bg-background"
                  >
                    <header
                      className="border-b px-4 py-3"
                      style={{ backgroundColor: meta.headerColor, borderColor: meta.borderColor }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-700">{meta.group}</p>
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

const applyAutomations = (booking: Booking, targetStage: KommoPipelineStageId, drivers: Driver[]) => {
  const stageMeta = KOMMO_PIPELINE_STAGE_META[targetStage]
  const updatedBooking: Booking = {
    ...booking,
    status: stageMeta.bookingStatus,
    kommoStatusId: Number(targetStage),
  }

  if (stageMeta.bookingStatus === "preparation" && !booking.driverId) {
    const fallbackDriver = drivers.find((driver) => driver.status === "Available") ?? drivers[0]
    if (fallbackDriver) {
      updatedBooking.driverId = fallbackDriver.id
    }
  }

  if (stageMeta.bookingStatus === "delivery" && !booking.targetTime) {
    updatedBooking.targetTime = Date.now() + 2 * 60 * 60 * 1000
  }

  if (stageMeta.bookingStatus === "settlement") {
    updatedBooking.targetTime = null
  }

  return { updatedBooking }
}

function normalizeStageId(value: Booking["kommoStatusId"]): StageBucketId {
  const stringId = value ? String(value) : null
  if (stringId && KOMMO_PIPELINE_STAGE_META[stringId as KommoPipelineStageId]) {
    return stringId as KommoPipelineStageId
  }
  return "fallback"
}

function resolveStageMeta(stageId: StageBucketId) {
  if (stageId === "fallback") {
    return FALLBACK_KOMMO_STAGE_META
  }
  return KOMMO_PIPELINE_STAGE_META[stageId]
}

type KanbanCardProps = {
  booking: Booking
  draggableProps: DraggableProvidedDraggableProps
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined
  isDragging: boolean
}

const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ booking, dragHandleProps, draggableProps, isDragging }, ref) => {
  const router = useRouter()
  const outstanding = Math.max(booking.totalAmount - booking.paidAmount, 0)
  const typeLabel = BOOKING_TYPES[booking.type]
  const dateRange = `${datelikeFormatter.format(new Date(booking.startDate))} – ${datelikeFormatter.format(
    new Date(booking.endDate)
  )}`
  const targetTime = booking.targetTime ? timeFormatter.format(new Date(booking.targetTime)) : null
  const handleClick = () => {
    if (isDragging) return
    const bookingId = String(booking.id)
      const detailUrl = `/bookings/${bookingId}?view=operations`
      router.push(detailUrl as RouterPushInput)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleClick()
    }
  }
  return (
    <article
      ref={ref}
      {...draggableProps}
      {...dragHandleProps}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={cn(
        "space-y-3 rounded-2xl border border-border bg-card/80 p-4 shadow-sm transition cursor-pointer",
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
