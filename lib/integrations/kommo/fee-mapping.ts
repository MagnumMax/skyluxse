export const KOMMO_DELIVERY_FEE_MAP: Record<string, number> = {
  // Delivery Fee (Field ID: 1234177)
  "958617": 100, // Delivery Fee- 100 aed
  "958619": 150, // Delivery Fee- 150 aed
  "958621": 200, // Delivery Fee- 200 aed
  "958623": 500, // Delivery Fee- 500 aed
  "958625": 0,   // Delivery Fee- 0 aed
}

export const KOMMO_DELIVERY_LABEL_TO_ID: Record<string, string> = {
  "Delivery Fee- 100 aed": "958617",
  "Delivery Fee- 150 aed": "958619",
  "Delivery Fee- 200 aed": "958621",
  "Delivery Fee- 500 aed": "958623",
  "Delivery Fee- 0 aed": "958625",
}

export const KOMMO_INSURANCE_FEE_MAP: Record<string, number> = {
  // Deposit Options (Field ID: 1234175)
  // Mapped to Insurance/Deposit Fee logic
  "958607": 0,    // No Deposit
  "958609": 200,  // No Deposit Fee -200 aed (This is a fee, cost to client)
  "958611": 2000, // Security Deposit -2000 aed (Refundable deposit)
  "958613": 1500, // Security Deposit -1500 aed
  "958615": 1000, // Security Deposit -1000 aed
}

export const KOMMO_INSURANCE_LABEL_TO_ID: Record<string, string> = {
  "No Deposit": "958607",
  "No Deposit Fee -200 aed": "958609",
  "Security Deposit -2000 aed": "958611",
  "Security Deposit -1500 aed": "958613",
  "Security Deposit -1000 aed": "958615",
}

// IDs that represent refundable deposits (should NOT be taxed)
export const KOMMO_REFUNDABLE_DEPOSIT_IDS = new Set([
  "958611", // Security Deposit -2000 aed
  "958613", // Security Deposit -1500 aed
  "958615", // Security Deposit -1000 aed
]);

export const KOMMO_DEPOSIT_FEE_MAP: Record<string, number> = {
    // Currently using INSURANCE_FEE_MAP for Deposit Options in code logic
    // But if we separate them later, we can move IDs here.
    // For now, let's duplicate the deposit options here if they are used as depositFee
    "958607": 0,    // No Deposit
    "958611": 2000, // Security Deposit -2000 aed
    "958613": 1500, // Security Deposit -1500 aed
    "958615": 1000, // Security Deposit -1000 aed
    // Note: "No Deposit Fee -200 aed" (958609) is technically a fee, not a refundable deposit.
    // In booking-totals.ts:
    // insuranceFee = resolvedInsuranceFee (from INSURANCE_FEE_MAP)
    // depositFee = resolveFee(inputs.depositOptionLabel, KOMMO_DEPOSIT_FEE_MAP)
    
    // In live-data.ts:
    // insuranceFeeLabel: row.insurance_fee_label
    // depositOptionLabel: null (we set it to null to avoid duplication)
    
    // So actually, currently `depositOptionLabel` is null, so `depositFee` will be 0.
    // All these values will come through `insuranceFee` if `insuranceFeeLabel` is used.
    // But `insuranceFeeLabel` corresponds to Field 1234175 (Deposit Options).
    
    // So "Security Deposit" values will be added to `insuranceFee`.
    // Wait, is Security Deposit an *additional cost* or just a hold?
    // If it's a hold, it shouldn't increase the `total` revenue of the booking, but `totalWithVat` or `totalAmount` usually includes what the client has to pay *now*.
    // However, usually deposits are handled separately.
    // If the user wants to Fix the "Incorrect Amount" in Zoho, and Zoho `total` is sum of everything.
    // If "Security Deposit" is added to `subtotal`, it becomes part of the Invoice/Sales Order total.
    // If it's a refundable deposit, maybe it shouldn't be taxed?
    // In `booking-totals.ts`: `vat = subtotal > 0 ? subtotal * vatRate : 0`.
    // So it IS taxed if it's in subtotal. Security deposits usually are NOT taxed.
    
    // But I will follow the mapping request first.
}
