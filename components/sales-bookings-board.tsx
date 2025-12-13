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
import { resolveBookingTotalWithVat } from "@/lib/pricing/booking-totals"
import {
  BOOKING_TYPES,
  FALLBACK_KOMMO_STAGE_META,
  BOOKING_STAGE_FILTER_DEFAULTS,
  KOMMO_PIPELINE_STAGE_META,
  KOMMO_PIPELINE_STAGE_ORDER,
  resolveBookingStageKey,
  type BookingStageKey,
  type KommoPipelineStageId,
} from "@/lib/constants/bookings"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type StageBucketId = KommoPipelineStageId | "fallback"

const stageOrder = KOMMO_PIPELINE_STAGE_ORDER
const hiddenStageIds: KommoPipelineStageId[] = ["79790631", "91703923", "143"]
const visibleStageOrder = stageOrder.filter((stageId) => !hiddenStageIds.includes(stageId))
type RouterPushInput = Parameters<ReturnType<typeof useRouter>["push"]>[0]
export type BookingSortOption = "start-date" | "priority" | "value" | "code"

type SalesBookingsBoardProps = {
  bookings: Booking[]
  drivers: Driver[]
  readOnly?: boolean
  searchTerm?: string
  onSearchTermChange?: (value: string) => void
  showSearchInput?: boolean
  stageFilters?: Record<BookingStageKey, boolean>
  sortOption?: BookingSortOption
  showFilters?: boolean
}

export function SalesBookingsBoard({
  bookings,
  drivers,
  readOnly = false,
  searchTerm,
  onSearchTermChange,
  showSearchInput = true,
  stageFilters,
  sortOption,
  showFilters = true,
}: SalesBookingsBoardProps) {
  const [boardBookings, setBoardBookings] = useState<Booking[]>(bookings)
  const [activityLog, setActivityLog] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [driverFilter, setDriverFilter] = useState<string>("all")
  const [localSearchTerm, setLocalSearchTerm] = useState("")
  const resolvedSearchTerm = searchTerm ?? localSearchTerm
  const handleSearchChange = onSearchTermChange ?? setLocalSearchTerm
  const activeStageFilters = stageFilters ?? BOOKING_STAGE_FILTER_DEFAULTS

  const filtered = useMemo(() => {
    return boardBookings.filter((booking) => {
      const stageKey = resolveBookingStageKey(booking)
      if (activeStageFilters && !activeStageFilters[stageKey]) {
        return false
      }
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
      if (resolvedSearchTerm.trim()) {
        const haystack = [
          booking.code,
          String(booking.id),
          booking.sourcePayloadId ?? "",
          booking.clientName,
          booking.carName,
          booking.carPlate ?? "",
          booking.carExternalRef ?? "",
          booking.channel,
          booking.segment,
          booking.tags?.join(" ") ?? "",
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(resolvedSearchTerm.toLowerCase())) {
          return false
        }
      }
      return true
    })
  }, [activeStageFilters, boardBookings, driverFilter, resolvedSearchTerm, typeFilter])

  const grouped = useMemo(() => {
    const initialEntries = [...stageOrder, "fallback" as const].map((stageId) => [stageId, [] as Booking[]])
    const buckets = Object.fromEntries(initialEntries) as Record<StageBucketId, Booking[]>

    filtered.forEach((booking) => {
      const key = normalizeStageId(booking.kommoStatusId)
      buckets[key].push(booking)
    })

    if (sortOption) {
      const comparator = buildBookingComparator(sortOption)
      Object.keys(buckets).forEach((key) => {
        const bucketKey = key as StageBucketId
        buckets[bucketKey] = [...buckets[bucketKey]].sort(comparator)
      })
    }

    return buckets
  }, [filtered, sortOption])

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
      {showFilters ? (
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
            {showSearchInput ? (
              <div className="flex-1 space-y-1 min-w-[200px]">
                <Label htmlFor="kanban-search">Search</Label>
                <Input
                  id="kanban-search"
                  placeholder="Search booking, client, vehicle"
                  value={resolvedSearchTerm}
                  onChange={(event) => handleSearchChange(event.target.value)}
                />
              </div>
            ) : null}
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setTypeFilter("all")
                  setDriverFilter("all")
                  handleSearchChange("")
                }}
              >
                Reset filters
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="lg:overflow-x-auto lg:pb-1">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:min-w-max lg:gap-4">
            {(
              [...visibleStageOrder, ...(grouped.fallback.length ? ["fallback" as const] : [])] as StageBucketId[]
            ).map((stageId) => {
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
                    className="flex flex-col rounded-2xl border border-border/70 bg-background lg:w-[320px] lg:flex-shrink-0"
                  >
                    <header
                      className="border-b px-4 py-3"
                      style={{ backgroundColor: meta.headerColor, borderColor: meta.borderColor }}
                    >
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

function buildBookingComparator(sortOption: BookingSortOption) {
  const priorityWeight: Record<Booking["priority"], number> = { high: 3, medium: 2, low: 1 }

  return (a: Booking, b: Booking) => {
    switch (sortOption) {
      case "start-date": {
        const aStart = Date.parse(a.startDate)
        const bStart = Date.parse(b.startDate)
        if (!Number.isNaN(aStart) && !Number.isNaN(bStart)) return aStart - bStart
        return 0
      }
      case "priority": {
        const aScore = priorityWeight[a.priority] ?? 0
        const bScore = priorityWeight[b.priority] ?? 0
        return bScore - aScore
      }
      case "value": {
        const aValue = Number.isFinite(a.totalAmount) ? (a.totalAmount as number) : 0
        const bValue = Number.isFinite(b.totalAmount) ? (b.totalAmount as number) : 0
        return bValue - aValue
      }
      case "code":
      default:
        return a.code.localeCompare(b.code)
    }
  }
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0,
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
  const startLabel = formatDateTimeLabel(booking.startTime ?? booking.startDate)
  const endLabel = formatDateTimeLabel(booking.endTime ?? booking.endDate)
  const dateRange = startLabel && endLabel ? `${startLabel} – ${endLabel}` : startLabel ?? endLabel ?? "—"
  const plateLabel = booking.carPlate?.trim().length ? booking.carPlate : null
  const agreementNumber = booking.agreementNumber?.trim().length ? booking.agreementNumber : null
  const totalWithVat = resolveBookingTotalWithVat(booking)
  const amountLabel = currencyFormatter.format(totalWithVat ?? booking.totalAmount ?? 0)
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
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{booking.carName}</p>
          <p className="text-xs text-muted-foreground">{plateLabel ?? "—"}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-700">
            {agreementNumber ?? "—"}
          </span>
        </div>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p className="text-sm font-medium text-foreground">{booking.clientName}</p>
        <p>{dateRange}</p>
        <p className="text-sm font-semibold text-foreground">{amountLabel}</p>
        {booking.pickupLocation ? (
          <p>
            <span className="font-medium text-foreground">Route:</span> {booking.pickupLocation}
            {booking.dropoffLocation ? ` → ${booking.dropoffLocation}` : ""}
          </p>
        ) : null}
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

function formatDateTimeLabel(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return dateTimeFormatter.format(date)
}
