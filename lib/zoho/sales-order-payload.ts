export type ZohoSalesOrderCustomField = {
  customfield_id: string
  value: string | number | undefined
}

export type BookingForZohoSalesOrder = {
  startDate?: string | null
  endDate?: string | null
  deliveryLocation?: string | null
  pickupLocation?: string | null
  mileageLimit?: string | number | null
  advancePayment?: string | number | null
  ownerName?: string | null
}

const toDateOnly = (value: string | null | undefined) => value?.split("T")[0]

// Extracted from Zoho Salespersons list.
const SALESPERSON_MAP: Record<string, string> = {
  aleksei: "6183693000000293023",
  danil: "6183693000000293150",
  konstantin: "6183693000000293152",
  siddharth: "6183693000001836001",
  elena: "6183693000002460005",
}

export function resolveZohoSalespersonId(ownerName: string | null | undefined): string {
  const normalizedOwner = ownerName?.toLowerCase() ?? ""
  for (const [key, id] of Object.entries(SALESPERSON_MAP)) {
    if (normalizedOwner.includes(key)) return id
  }

  // Field is mandatory in Zoho Books; keep a safe default.
  return SALESPERSON_MAP.aleksei
}

export function buildZohoSalesOrderCustomFields(
  booking: BookingForZohoSalesOrder,
): ZohoSalesOrderCustomField[] {
  const customFields: ZohoSalesOrderCustomField[] = [
    {
      customfield_id: "6183693000001829012", // Pick Up Date
      value: toDateOnly(booking.startDate),
    },
    {
      customfield_id: "6183693000001829002", // Drop Off Date
      value: toDateOnly(booking.startDate),
    },
    {
      customfield_id: "6183693000001829066", // Rental Location
      value: booking.deliveryLocation || booking.pickupLocation || "",
    },
    {
      customfield_id: "6183693000001869037", // KM Limit
      value: booking.mileageLimit ?? "",
    },
  ]

  if (booking.advancePayment) {
    customFields.push({
      customfield_id: "6183693000002201003", // Advance payment
      value: String(booking.advancePayment),
    })
  }

  return customFields
}
