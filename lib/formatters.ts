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
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      timeZone: "Asia/Dubai",
      month: "short",
      day: "numeric",
      ...options,
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function formatDateTime(value?: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—"
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Dubai",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
  try {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, { ...defaultOptions, ...options }).format(new Date(value))
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

export function toDubaiDate(date: Date | string | number): Date {
  const d = new Date(date)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  })

  const parts = formatter.formatToParts(d)
  const part = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10)

  return new Date(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second")
  )
}

export function fromDubaiDate(shiftedDate: Date): Date {
  const year = shiftedDate.getFullYear()
  const month = String(shiftedDate.getMonth() + 1).padStart(2, "0")
  const day = String(shiftedDate.getDate()).padStart(2, "0")
  const hour = String(shiftedDate.getHours()).padStart(2, "0")
  const minute = String(shiftedDate.getMinutes()).padStart(2, "0")
  const second = String(shiftedDate.getSeconds()).padStart(2, "0")

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+04:00`)
}

export function formatZohoDate(value?: string | Date) {
  if (!value) return undefined
  try {
    const d = new Date(value)
    // Format to YYYY-MM-DD in Dubai time
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d)
  } catch {
    return undefined
  }
}

export function formatZohoDateTime(value?: string | Date) {
  if (!value) return ""
  try {
    const d = new Date(value)
    // Format to dd.MM.yyyy HH:mm in Dubai time
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    return formatter.format(d).replace(/\//g, ".").replace(",", "")
  } catch {
    return ""
  }
}
