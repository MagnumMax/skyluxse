import type { Booking } from "@/lib/domain/entities"
import { 
  KOMMO_DELIVERY_FEE_MAP, 
  KOMMO_INSURANCE_FEE_MAP, 
  KOMMO_DEPOSIT_FEE_MAP, 
  KOMMO_REFUNDABLE_DEPOSIT_IDS,
  KOMMO_DELIVERY_LABEL_TO_ID,
  KOMMO_INSURANCE_LABEL_TO_ID
} from "@/lib/integrations/kommo/fee-mapping"

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
  refundableDeposit: number
  total: number
  vat: number
  totalWithVat: number
}

export function resolveFee(
  label: string | null | undefined, 
  map: Record<string, number>,
  labelMap?: Record<string, string>
): number {
  if (!label) return 0
  
  // 1. Try to match by ID from the map
  if (map[label] !== undefined) {
    return map[label]
  }

  // 2. Try to match by Label -> ID -> Map
  if (labelMap && labelMap[label]) {
    const id = labelMap[label]
    if (map[id] !== undefined) {
      return map[id]
    }
  }

  // 3. Fallback: Parse number from string (Backward Compatibility)
  // User Note: "Negative numbers should NOT be converted to positive via Math.abs"
  // If the label is "Discount -500", we want -500.
  const normalized = label.replace(/,/g, "").trim()
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  if (!match) return 0
  
  const value = Number(match[0])
  return Number.isFinite(value) ? value : 0
}

export function parseAmountFromLabel(label?: string | null): number {
    // Deprecated: Use resolveFee with specific map
    // But for generic usage without map, we use the new logic (no Math.abs)
    if (!label) return 0
    const normalized = label.replace(/,/g, "").trim()
    const match = normalized.match(/-?\d+(?:\.\d+)?/)
    if (!match) return 0
    const value = Number(match[0])
    return Number.isFinite(value) ? value : 0
}

export function computeBookingTotals(
  inputs: BookingPricingInputs,
  vatRate: number = DEFAULT_VAT_RATE
): BookingTotals | null {
  const duration = Math.max(0, inputs.durationDays ?? 0)
  const dailyRate = Math.max(0, inputs.dailyRate ?? 0)
  const base = duration * dailyRate
  
  const deliveryFee = resolveFee(inputs.deliveryFeeLabel, KOMMO_DELIVERY_FEE_MAP, KOMMO_DELIVERY_LABEL_TO_ID)
  
  // Logic update: separate Refundable Deposit from Taxable Insurance Fee
  let insuranceFee = 0
  let refundableDeposit = 0

  if (inputs.insuranceFeeAmount != null && inputs.insuranceFeeAmount > 0) {
     // Direct amount override (usually legacy or manual override)
     // Assumed to be taxable fee unless specified otherwise
     insuranceFee = inputs.insuranceFeeAmount
  } else {
     // Resolve from Label/ID
     const rawValue = resolveFee(inputs.insuranceFeeLabel, KOMMO_INSURANCE_FEE_MAP, KOMMO_INSURANCE_LABEL_TO_ID)
     
     // Check if this ID is a Refundable Deposit
     let isRefundable = false
     if (inputs.insuranceFeeLabel) {
         if (KOMMO_REFUNDABLE_DEPOSIT_IDS.has(inputs.insuranceFeeLabel)) {
             isRefundable = true
         } else if (KOMMO_INSURANCE_LABEL_TO_ID[inputs.insuranceFeeLabel] && KOMMO_REFUNDABLE_DEPOSIT_IDS.has(KOMMO_INSURANCE_LABEL_TO_ID[inputs.insuranceFeeLabel])) {
             isRefundable = true
         }
     }
     
     if (isRefundable) {
         refundableDeposit = rawValue
     } else {
         insuranceFee = rawValue
     }
  }

  const depositFee = resolveFee(inputs.depositOptionLabel, KOMMO_DEPOSIT_FEE_MAP)
  
  // subtotal for VAT calculation (Taxable amount)
  const taxableSubtotal = base + deliveryFee + insuranceFee + depositFee
  
  // Total to pay (includes refundable deposit)
  const total = taxableSubtotal + refundableDeposit

  const hasValues = base > 0 || deliveryFee !== 0 || insuranceFee !== 0 || depositFee !== 0 || refundableDeposit !== 0
  if (!hasValues) {
    return null
  }
  
  const vat = taxableSubtotal > 0 ? taxableSubtotal * vatRate : 0
  const totalWithVat = taxableSubtotal + vat + refundableDeposit
  
  return {
    base,
    deliveryFee,
    insuranceFee,
    depositFee,
    refundableDeposit,
    total: taxableSubtotal, // Keeping 'total' as Taxable Subtotal or Grand Total? 
    // Convention: 'total' usually means Subtotal before Tax.
    // 'totalWithVat' means Grand Total.
    // If we put refundableDeposit in totalWithVat but not in total/vat, it's correct.
    // But let's clarify:
    // base + delivery + insurance + depositFee = Taxable Subtotal
    // Taxable Subtotal * VAT = VAT Amount
    // Taxable Subtotal + VAT + Refundable Deposit = Grand Total (Client pays this)
    
    // So 'total' field in BookingTotals usually meant "Subtotal".
    // I will keep 'total' as taxableSubtotal to match existing logic where vat = total * rate.
    
    vat,
    totalWithVat,
  }
}

export function resolveBookingTotalWithVat(booking: Booking) {
  const billing = booking.billing
  if (!billing) {
    return booking.totalAmount
  }
  const base = billing.base ?? 0
  const addons = billing.addons ?? 0
  const fees = billing.fees ?? 0
  const discounts = billing.discounts ?? 0
  const subtotal = base + addons + fees - discounts
  if (subtotal <= 0) {
    return booking.totalAmount
  }
  const vatRate = typeof billing.vatRate === "number" ? billing.vatRate : DEFAULT_VAT_RATE
  return subtotal * (1 + vatRate)
}
