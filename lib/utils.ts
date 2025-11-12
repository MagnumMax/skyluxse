import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type BookingViewVariant = "operations" | "sales" | "exec"
export type BookingBoardVariant = "sales" | "exec"

export function resolveBookingViewVariant(viewParam?: string | string[]): BookingViewVariant {
  const view = Array.isArray(viewParam) ? viewParam[0] : viewParam
  if (view === "operations" || view === "exec") {
    return view
  }
  return "sales"
}

export function resolveBookingBoardVariant(viewParam?: string | string[]): BookingBoardVariant {
  const view = Array.isArray(viewParam) ? viewParam[0] : viewParam
  return view === "exec" ? "exec" : "sales"
}

export function getBookingBoardHeading(variant: BookingBoardVariant) {
  return variant === "exec" ? "Lifecycle overview" : "Booking lifecycle board"
}
