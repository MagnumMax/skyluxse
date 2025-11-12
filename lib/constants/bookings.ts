import type { BookingPriority, BookingStatus, BookingType } from "@/lib/domain/entities"

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
  | "75440391"
  | "75440395"
  | "75440399"
  | "76475495"
  | "78486287"
  | "75440643"
  | "75440639"
  | "142"
  | "143"

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
    label: "Request bot answering",
    group: "Intake",
    description: "Bot captured a new lead; waiting for first human response.",
    headerColor: "#99ccff",
    borderColor: "#6fa8dc",
    bookingStatus: "new",
  },
  {
    id: "91703923",
    label: "Follow up",
    group: "Intake",
    description: "Sales team is qualifying the request and confirming details.",
    headerColor: "#99ccff",
    borderColor: "#6fa8dc",
    bookingStatus: "new",
  },
  {
    id: "75440391",
    label: "Confirmed bookings",
    group: "Preparation",
    description: "Documents and payments are confirmed; assign assets.",
    headerColor: "#d6eaff",
    borderColor: "#9cc3e4",
    bookingStatus: "preparation",
  },
  {
    id: "75440395",
    label: "Delivery within 24 hours",
    group: "Delivery",
    description: "Delivery window approaching; prepare drivers and vehicles.",
    headerColor: "#fffeb2",
    borderColor: "#d6d37a",
    bookingStatus: "delivery",
  },
  {
    id: "75440399",
    label: "Car with Customers",
    group: "Live",
    description: "Vehicle handed over; monitor trip progress and SLA.",
    headerColor: "#fffd7f",
    borderColor: "#d4c95a",
    bookingStatus: "in-rent",
  },
  {
    id: "76475495",
    label: "Pick up within 24 hours",
    group: "Return",
    description: "Plan pickup logistics and final instructions for the driver.",
    headerColor: "#ebffb1",
    borderColor: "#b5d67d",
    bookingStatus: "delivery",
  },
  {
    id: "78486287",
    label: "OBJECTIONS",
    group: "Live",
    description: "Client raised objections; coordinate resolution and next steps.",
    headerColor: "#ebffb1",
    borderColor: "#b5d67d",
    bookingStatus: "preparation",
  },
  {
    id: "75440643",
    label: "Refund Deposit",
    group: "Settlement",
    description: "Deposit refund in progress; confirm inspections and charges.",
    headerColor: "#deff81",
    borderColor: "#a9d44c",
    bookingStatus: "settlement",
  },
  {
    id: "75440639",
    label: "Deal is Closed",
    group: "Settlement",
    description: "All paperwork done; awaiting final approvals.",
    headerColor: "#87f2c0",
    borderColor: "#54c995",
    bookingStatus: "settlement",
  },
  {
    id: "142",
    label: "Closed · won",
    group: "Closed",
    description: "Lead converted successfully; booking archived as won.",
    headerColor: "#ccff66",
    borderColor: "#97d433",
    bookingStatus: "settlement",
  },
  {
    id: "143",
    label: "Closed · lost",
    group: "Closed",
    description: "Lead lost or cancelled; keep for reporting.",
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
