const DEFAULT_LOCALE = "en-CA"

export function formatNumber(value?: number, options?: Intl.NumberFormatOptions) {
  if (value == null) return "—"
  return new Intl.NumberFormat(DEFAULT_LOCALE, { maximumFractionDigits: 0, ...options }).format(value)
}

export function formatCurrency(value?: number, currency = "AED", options?: Intl.NumberFormatOptions) {
  if (value == null) return "—"
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(value)
}

export function formatDate(value?: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, options ?? { month: "short", day: "numeric" }).format(new Date(value))
  } catch {
    return value
  }
}

export function formatDateTime(value?: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—"
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
  try {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, options ?? defaultOptions).format(new Date(value))
  } catch {
    return value
  }
}

export function titleCase(value?: string, fallback = "—") {
  if (!value) return fallback
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}
