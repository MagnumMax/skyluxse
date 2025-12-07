import type { Booking, BookingPriority, BookingStatus, BookingType } from "@/lib/domain/entities"

export const BOOKING_TYPES: Record<BookingType, string> = {
  vip: "VIP",
  short: "Short rent",
  corporate: "Corporate",
  rental: "Rental",
  chauffeur: "Chauffeur",
  transfer: "Transfer",
}

export const BOOKING_PRIORITIES: Record<BookingPriority, { label: string; className: string }> = {
  high: { label: "High", className: "bg-rose-600/10 text-rose-600" },
  medium: { label: "Medium", className: "bg-amber-500/10 text-amber-600" },
  low: { label: "Low", className: "bg-emerald-500/10 text-emerald-600" },
}

export type KommoPipelineStageId =
  | "79790631"
  | "91703923"
  | "96150292"
  | "75440391"
  | "75440395"
  | "75440399"
  | "76475495"
  | "78486287"
  | "75440643"
  | "75440639"
  | "142"
  | "143"

/**
 * Kommo status IDs that trigger automatic Zoho Sales Order creation
 * - "96150292": Waiting for Payment
 * - "75440391": Confirmed Bookings
 * - "75440395": Delivery Within 24 Hours
 */
export const KOMMO_STATUSES_FOR_SALES_ORDER: readonly KommoPipelineStageId[] = [
  "96150292", // Waiting for Payment
  "75440391", // Confirmed Bookings
  "75440395", // Delivery Within 24 Hours
] as const

export type KommoPipelineStageMeta = {
  id: KommoPipelineStageId
  label: string
  group: string
  description: string
  headerColor: string
  borderColor: string
  bookingStatus: BookingStatus
}

const KOMMO_STAGE_DEFINITIONS: KommoPipelineStageMeta[] = [
  {
    id: "79790631",
    label: "Request Bot Answering",
    group: "Intake",
    description: "Bot logged lead; waiting on human follow-up.",
    headerColor: "#99ccff",
    borderColor: "#6fa8dc",
    bookingStatus: "new",
  },
  {
    id: "91703923",
    label: "Follow Up",
    group: "Intake",
    description: "Sales validating details with client.",
    headerColor: "#99ccff",
    borderColor: "#6fa8dc",
    bookingStatus: "new",
  },
  {
    id: "96150292",
    label: "Waiting for Payment",
    group: "Preparation",
    description: "Hold assets until upfront payment clears.",
    headerColor: "#cfe4ff",
    borderColor: "#96bbe0",
    bookingStatus: "preparation",
  },
  {
    id: "75440391",
    label: "Confirmed Bookings",
    group: "Preparation",
    description: "Docs ready; assign vehicle and driver.",
    headerColor: "#d6eaff",
    borderColor: "#9cc3e4",
    bookingStatus: "preparation",
  },
  {
    id: "75440395",
    label: "Delivery Within 24 Hours",
    group: "Delivery",
    description: "Prep delivery run for the upcoming day.",
    headerColor: "#fffeb2",
    borderColor: "#d6d37a",
    bookingStatus: "delivery",
  },
  {
    id: "75440399",
    label: "Car with Customers",
    group: "Live",
    description: "Vehicle with client; monitor trip and SLA.",
    headerColor: "#fffd7f",
    borderColor: "#d4c95a",
    bookingStatus: "in-rent",
  },
  {
    id: "76475495",
    label: "Pick Up Within 24 Hours",
    group: "Return",
    description: "Schedule pickup and closing logistics.",
    headerColor: "#ebffb1",
    borderColor: "#b5d67d",
    bookingStatus: "delivery",
  },
  {
    id: "78486287",
    label: "Objections",
    group: "Live",
    description: "Customer raised concerns under review.",
    headerColor: "#ebffb1",
    borderColor: "#b5d67d",
    bookingStatus: "preparation",
  },
  {
    id: "75440643",
    label: "Refund Deposit",
    group: "Settlement",
    description: "Processing inspections and deposit refund.",
    headerColor: "#deff81",
    borderColor: "#a9d44c",
    bookingStatus: "settlement",
  },
  {
    id: "75440639",
    label: "Deal Is Closed",
    group: "Settlement",
    description: "Paperwork complete; awaiting archive.",
    headerColor: "#87f2c0",
    borderColor: "#54c995",
    bookingStatus: "settlement",
  },
  {
    id: "142",
    label: "Closed · Won",
    group: "Closed",
    description: "Won lead; archive booking record.",
    headerColor: "#ccff66",
    borderColor: "#97d433",
    bookingStatus: "settlement",
  },
  {
    id: "143",
    label: "Closed · Lost",
    group: "Closed",
    description: "Lost lead; keep for reporting only.",
    headerColor: "#d5d8db",
    borderColor: "#a6a9ac",
    bookingStatus: "settlement",
  },
]

export const KOMMO_PIPELINE_STAGE_META: Record<KommoPipelineStageId, KommoPipelineStageMeta> =
  KOMMO_STAGE_DEFINITIONS.reduce((acc, stage) => {
    acc[stage.id] = stage
    return acc
  }, {} as Record<KommoPipelineStageId, KommoPipelineStageMeta>)

export const KOMMO_PIPELINE_STAGE_ORDER: KommoPipelineStageId[] = KOMMO_STAGE_DEFINITIONS.map(
  (stage) => stage.id
)

type FallbackKommoStageMeta = Omit<KommoPipelineStageMeta, "id"> & { id: "fallback" }

export const FALLBACK_KOMMO_STAGE_META: FallbackKommoStageMeta = {
  id: "fallback",
  label: "Unmapped stage",
  group: "Other",
  description: "Kommo returned an unknown stage; review lead in Kommo.",
  headerColor: "#e5e7eb",
  borderColor: "#cbd5f5",
  bookingStatus: "settlement",
}

export type BookingStageKey = "confirmed" | "delivery" | "in-rent" | "pickup" | "closed" | "other"

export const BOOKING_STAGE_FILTER_DEFAULTS: Record<BookingStageKey, boolean> = {
  confirmed: true,
  delivery: true,
  "in-rent": true,
  pickup: true,
  closed: true,
  other: false,
}

export function createDefaultBookingStageFilters() {
  return { ...BOOKING_STAGE_FILTER_DEFAULTS }
}

export function resolveStageKeyFromKommoStatus(kommoStatusId?: string | number | null): BookingStageKey {
  const normalizedId = kommoStatusId ? String(kommoStatusId) : null
  switch (normalizedId) {
    case "75440391": // Confirmed Bookings
      return "confirmed"
    case "75440395": // Delivery Within 24 Hours
      return "delivery"
    case "75440399": // Car with Customers
      return "in-rent"
    case "76475495": // Pick Up Within 24 Hours
      return "pickup"
    case "142": // Closed · Won
    case "75440643": // Refund Deposit
    case "78486287": // Objections
      return "closed"
    default:
      return "other"
  }
}

export function resolveBookingStageKey(booking: Pick<Booking, "kommoStatusId" | "status">): BookingStageKey {
  const fromKommo = resolveStageKeyFromKommoStatus(booking.kommoStatusId)
  if (fromKommo !== "other") return fromKommo

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
}
