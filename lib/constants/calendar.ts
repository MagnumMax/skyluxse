import type { CalendarEventType } from "@/lib/domain/entities"

export const calendarEventTypes: Record<CalendarEventType, { label: string; surface: string; border: string }> = {
  rental: {
    label: "Rental",
    surface: "bg-indigo-100",
    border: "border-indigo-200",
  },
  maintenance: {
    label: "Maintenance",
    surface: "bg-amber-50",
    border: "border-amber-200",
  },
  repair: {
    label: "Repair",
    surface: "bg-rose-100",
    border: "border-rose-200",
  },
}
