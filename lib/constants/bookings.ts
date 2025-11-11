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

export const KANBAN_STATUS_META: Record<BookingStatus, {
  label: string
  group: string
  accent: string
  accentBorder: string
  description: string
}> = {
  new: {
    label: "New booking",
    group: "Intake",
    accent: "bg-slate-100",
    accentBorder: "border-slate-200",
    description: "Booking imported from Kommo or created manually.",
  },
  preparation: {
    label: "Vehicle preparation",
    group: "Fleet",
    accent: "bg-violet-100",
    accentBorder: "border-violet-200",
    description: "Detailing, paperwork, and driver assignment.",
  },
  delivery: {
    label: "Awaiting delivery",
    group: "Fleet",
    accent: "bg-indigo-100",
    accentBorder: "border-indigo-200",
    description: "Driver en route or waiting for client.",
  },
  "in-rent": {
    label: "In rental",
    group: "Live",
    accent: "bg-blue-100",
    accentBorder: "border-blue-200",
    description: "Rental in progress; monitor SLA and payments.",
  },
  settlement: {
    label: "Return & settlement",
    group: "Closing",
    accent: "bg-emerald-100",
    accentBorder: "border-emerald-200",
    description: "Final inspection, fines, and deposit returns.",
  },
}
