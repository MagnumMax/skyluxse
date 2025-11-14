export type BookingLifecycleStatus = "lead" | "confirmed" | "delivery" | "in_progress" | "completed" | "cancelled"

export type DocumentSyncPayload = {
  fileUuid: string
  fileName: string
  fileSize: number | null
  versionUuid: string | null
  docType: string
  clientId: string
  contactId: string
  fieldId: number
}

export type HandleResult = {
  leadId: number | string
  processed?: boolean
  skipped?: boolean
  statusId: string | null
  statusLabel: string | null
}

export type StageMetadata = {
  stageId: string
  label: string
  bookingStatus: BookingLifecycleStatus
}

export type StageLookup = {
  byPipelineStatus: Map<string, StageMetadata>
  byStatus: Map<string, StageMetadata>
}

export type ResolvedStageInfo = {
  stageId: string | null
  label: string
  bookingStatus: BookingLifecycleStatus
}

export type BookingOptions = {
  vehicleId?: string | null
  startAt?: string | null
  endAt?: string | null
  deliveryFeeLabel?: string | null
  deliveryLocation?: string | null
  collectLocation?: string | null
  rentalDurationDays?: number | null
  priceDaily?: number | null
  insuranceFeeLabel?: string | null
  advancePayment?: number | null
  salesOrderUrl?: string | null
  agreementNumber?: string | null
}
