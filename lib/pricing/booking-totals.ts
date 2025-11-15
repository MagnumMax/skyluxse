export const DEFAULT_VAT_RATE = 0.05

export type BookingPricingInputs = {
  dailyRate?: number | null
  durationDays?: number | null
  deliveryFeeLabel?: string | null
  insuranceFeeLabel?: string | null
  insuranceFeeAmount?: number | null
  depositOptionLabel?: string | null
}

export type BookingTotals = {
  base: number
  deliveryFee: number
  insuranceFee: number
  depositFee: number
  total: number
  vat: number
  totalWithVat: number
}

export function parseAmountFromLabel(label?: string | null): number {
  if (!label) {
    return 0
  }
  const normalized = label.replace(/,/g, "").trim()
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  if (!match) {
    return 0
  }
  const value = Number(match[0])
  if (!Number.isFinite(value)) {
    return 0
  }
  // Kommo dropdown labels look like "Security Deposit -1500 aed";
  // take the absolute value so fees are always added as positive amounts.
  return Math.abs(value)
}

export function computeBookingTotals(
  inputs: BookingPricingInputs,
  vatRate: number = DEFAULT_VAT_RATE
): BookingTotals | null {
  const duration = Math.max(0, inputs.durationDays ?? 0)
  const dailyRate = Math.max(0, inputs.dailyRate ?? 0)
  const base = duration * dailyRate
  const deliveryFee = parseAmountFromLabel(inputs.deliveryFeeLabel)
  const resolvedInsuranceFee =
    inputs.insuranceFeeAmount != null && inputs.insuranceFeeAmount > 0
      ? inputs.insuranceFeeAmount
      : parseAmountFromLabel(inputs.insuranceFeeLabel)
  const insuranceFee = Math.max(0, resolvedInsuranceFee)
  const depositFee = parseAmountFromLabel(inputs.depositOptionLabel)
  const subtotal = base + deliveryFee + insuranceFee + depositFee
  const hasValues = base > 0 || deliveryFee !== 0 || insuranceFee !== 0 || depositFee !== 0
  if (!hasValues) {
    return null
  }
  const vat = subtotal > 0 ? subtotal * vatRate : 0
  const totalWithVat = subtotal + vat
  return {
    base,
    deliveryFee,
    insuranceFee,
    depositFee,
    total: subtotal,
    vat,
    totalWithVat,
  }
}
