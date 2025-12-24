"use client"

import { forwardRef, useCallback, useMemo, useState } from "react"
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

import type { Booking, Driver, KommoStageConfig } from "@/lib/domain/entities"
import { resolveBookingTotalWithVat } from "@/lib/pricing/booking-totals"
import {
  BOOKING_TYPES,
  FALLBACK_KOMMO_STAGE_META,
  BOOKING_STAGE_FILTER_DEFAULTS,
  type BookingStageKey,
} from "@/lib/constants/bookings"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type StageBucketId = string

const hiddenStageIds: string[] = ["79790631", "91703923", "143"]

type RouterPushInput = Parameters<ReturnType<typeof useRouter>["push"]>[0]
export type BookingSortOption = "start-date" | "priority" | "value" | "code"

type SalesBookingsBoardProps = {
  bookings: Booking[]
  drivers: Driver[]
  stages: KommoStageConfig[]
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
  stages,
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

  const stageOrder = useMemo(() => stages.map((s) => s.id), [stages])
  const visibleStageOrder = useMemo(
    () => stageOrder.filter((stageId) => !hiddenStageIds.includes(stageId)),
    [stageOrder]
  )

  const getStageConfig = useCallback(
    (id: string | number | null | undefined) => {
      if (!id) return null
      return stages.find((s) => s.id === String(id))
    },
    [stages]
  )

  const resolveBookingStageKey = useCallback(
    (booking: Pick<Booking, "kommoStatusId" | "status">): BookingStageKey => {
      const stageConfig = getStageConfig(booking.kommoStatusId)
      if (stageConfig?.booking_status) {
        return stageConfig.booking_status as BookingStageKey
      }
      switch (booking.status) {
        case "delivery":
          return "delivery"
        case "in-rent":
          return "in-rent"
        case "settlement":
          return "closed"
        default:
          return "other"
      }
    },
    [getStageConfig]
  )

  const normalizeStageId = useCallback(
    (value: Booking["kommoStatusId"]): StageBucketId => {
      const stringId = value ? String(value) : null
      if (stringId && stages.some((s) => s.id === stringId)) {
        return stringId
      }
      return "fallback"
    },
    [stages]
  )

  const resolveStageMeta = (stageId: StageBucketId) => {
    if (stageId === "fallback") {
      return FALLBACK_KOMMO_STAGE_META
    }
    const stage = stages.find((s) => s.id === stageId)
    if (stage) {
      return {
        label: stage.label,
        description: stage.description ?? "",
        headerColor: stage.header_color ?? "#e5e7eb",
        borderColor: stage.border_color ?? "#cbd5f5",
        bookingStatus: stage.booking_status,
      }
    }
    return FALLBACK_KOMMO_STAGE_META
  }

  const applyAutomations = (booking: Booking, targetStage: string, drivers: Driver[]) => {
    const stageMeta = resolveStageMeta(targetStage)
    const updatedBooking: Booking = {
      ...booking,
      status: (stageMeta.bookingStatus as Booking["status"]) || "new",
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
  }, [activeStageFilters, boardBookings, driverFilter, resolvedSearchTerm, resolveBookingStageKey, typeFilter])

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
  }, [filtered, normalizeStageId, sortOption, stageOrder])

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
    <div className="h-full space-y-6 rounded-2xl bg-slate-50/50 p-4 lg:p-6">
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
              const totalAmount = columnBookings.reduce((sum, b) => sum + (resolveBookingTotalWithVat(b) ?? b.totalAmount ?? 0), 0)
              
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
                      className="flex flex-col rounded-xl bg-white lg:w-[320px] lg:flex-shrink-0"
                    >
                      <header
                        className="border-t-[3px] px-3 py-3"
                        style={{ borderTopColor: meta.headerColor }}
                      >
                        <div className="flex flex-col gap-1">
                          <h2 className="text-sm font-bold text-slate-900">{meta.label}</h2>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-slate-900">{currencyFormatter.format(totalAmount)}</span>
                            <span className="mx-1">•</span>
                            <span>{columnBookings.length} {columnBookings.length === 1 ? 'Deal' : 'Deals'}</span>
                          </div>
                        </div>
                      </header>
                      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-4">
                        {columnBookings.length === 0 ? (
                          <div className="flex h-40 items-center justify-center">
                            <p className="text-sm text-muted-foreground/50">
                              This stage is empty
                            </p>
                          </div>
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
  timeZone: "Asia/Dubai",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 2,
})

type KanbanCardProps = {
  booking: Booking
  draggableProps: DraggableProvidedDraggableProps
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined
  isDragging: boolean
}

const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  ({ booking, dragHandleProps, draggableProps, isDragging }, ref) => {
    const router = useRouter()
    
    // Formatting
    const totalWithVat = resolveBookingTotalWithVat(booking)
    const amountLabel = currencyFormatter.format(totalWithVat ?? booking.totalAmount ?? 0)
    
    const dateStr = booking.createdAt ? shortDateFormatter.format(new Date(booking.createdAt)) : "—"
    
    // Interaction
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
          "flex flex-col gap-2 rounded-lg border border-border/40 bg-white p-3 shadow-sm transition hover:shadow-md cursor-pointer",
          isDragging && "ring-2 ring-primary shadow-lg rotate-2"
        )}
        data-booking-id={booking.id}
      >
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-bold text-slate-900 line-clamp-1">
            {booking.carName}
            {booking.carPlate ? ` • ${booking.carPlate}` : ""}
          </p>
          <p className="text-xs text-slate-500 line-clamp-1">{booking.clientName}</p>
        </div>
        
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
          <span className="font-medium text-slate-900">{amountLabel}</span>
          <span className="text-slate-300">•</span>
          <span className={booking.createdAt ? "text-red-400" : "text-slate-400"}>
             {dateStr}
          </span>
        </div>
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
