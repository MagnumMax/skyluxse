import { cache } from "react"
import { unstable_noStore as noStore } from "next/cache"

import type {
  Booking,
  BookingDocument,
  BookingInvoice,
  CalendarEvent,
  Client,
  ClientDocument,
  ClientNotification,
  ClientPayment,
  ClientRental,
  Driver,
  FleetCar,
} from "@/lib/domain/entities"
import { computeBookingTotals, DEFAULT_VAT_RATE } from "@/lib/pricing/booking-totals"
import { serviceClient } from "@/lib/supabase/service-client"

type ClientRow = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  kommo_contact_id: string | null
  residency_country: string | null
  tier: string | null
  segment: string | null
  gender: string | null
  outstanding_amount: number | null
  nps_score: number | null
  preferred_channels: string[] | null
  preferred_language: string | null
  timezone: string | null
  doc_status?: string | null
  doc_confidence?: number | null
  doc_model?: string | null
  doc_document_id?: string | null
  doc_raw?: Record<string, any> | null
  doc_type?: string | null
  first_name?: string | null
  last_name?: string | null
  middle_name?: string | null
  date_of_birth?: string | null
  nationality?: string | null
  address?: string | null
  document_number?: string | null
  issue_date?: string | null
  expiry_date?: string | null
  issuing_country?: string | null
  driver_license_class?: string | null
  driver_license_restrictions?: string | null
  driver_license_endorsements?: string | null
  doc_processed_at?: string | null
  doc_error?: string | null
  created_at: string | null
  updated_at: string | null
  created_by: string | null
  updated_by: string | null
}

const CLIENT_SELECT_COLUMNS = [
  "id",
  "name",
  "phone",
  "email",
  "kommo_contact_id",
  "residency_country",
  "tier",
  "segment",
  "gender",
  "outstanding_amount",
  "nps_score",
  "preferred_channels",
  "preferred_language",
  "timezone",
  "doc_status",
  "doc_confidence",
  "doc_model",
  "doc_document_id",
  "doc_raw",
  "doc_type",
  "first_name",
  "last_name",
  "middle_name",
  "date_of_birth",
  "nationality",
  "address",
  "document_number",
  "issue_date",
  "expiry_date",
  "issuing_country",
  "driver_license_class",
  "driver_license_restrictions",
  "driver_license_endorsements",
  "doc_processed_at",
  "doc_error",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ")

type VehicleRow = {
  id: string
  external_ref: string | null
  name: string | null
  make: string | null
  model: string | null
  vin: string | null
  plate_number: string | null
  status: string | null
  class: string | null
  body_style: string | null
  segment: string | null
  interior_color: string | null
  seating_capacity: number | null
  mileage_km: number | null
  utilization_pct: number | null
  revenue_ytd: number | null
  model_year: number | null
  exterior_color: string | null
  engine_displacement_l: number | null
  power_hp: number | null
  cylinders: number | null
  zero_to_hundred_sec: number | null
  transmission: string | null
  kommo_vehicle_id: string | null
  updated_at: string | null
  created_at: string | null
  created_by: string | null
  updated_by: string | null
  location?: string | null
  image_url?: string | null
}

type BookingRow = {
  id: string
  external_code: string | null
  client_id: string | null
  vehicle_id: string | null
  driver_id: string | null
  owner_id: string | null
  status: string | null
  booking_type: string | null
  channel: string | null
  priority: string | null
  start_at: string | null
  end_at: string | null
  total_amount: number | null
  deposit_amount: number | null
  created_at: string | null
  updated_at: string | null
  created_by: string | null
  kommo_status_id: number | null
  delivery_fee_label?: string | null
  delivery_location?: string | null
  collect_location?: string | null
  rental_duration_days?: number | null
  price_daily?: number | null
  insurance_fee_label?: string | null
  full_insurance_fee?: number | null
  advance_payment?: number | null
  sales_order_url?: string | null
  agreement_number?: string | null
  zoho_sales_order_id?: string | null
  sales_service_rating?: number | null
  sales_service_feedback?: string | null
  sales_service_rated_by?: string | null
  sales_service_rated_at?: string | null
  mileage_limit?: string | null
}

type BookingInvoiceRow = {
  id: string
  booking_id: string | null
  label: string | null
  invoice_type: string | null
  amount: number | null
  status: string | null
  issued_at: string | null
  due_at: string | null
}

type DriverProfileRow = {
  id: string
  status: string | null
  staff_account_id: string | null
}

type StaffRow = {
  id: string
  full_name: string | null
  role: string | null
}

export type StaffAccount = StaffRow

type DocumentRow = {
  id: string
  bucket: string | null
  storage_path: string | null
  file_name: string | null
  original_name: string | null
  mime_type: string | null
  size_bytes: number | null
  status: string | null
  source: string | null
  expires_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

type DocumentLinkRow = {
  id: string
  document_id: string
  scope: string
  entity_id: string
  doc_type?: string | null
  notes?: string | null
  metadata: Record<string, unknown> | null
  document: DocumentRow | null
}

type RawDocumentLinkRow = Omit<DocumentLinkRow, "document"> & {
  document: DocumentRow | DocumentRow[] | null
}

type ClientNotificationRow = {
  id: string
  client_id: string
  channel: string | null
  subject: string | null
  content: string | null
  sent_at: string | null
  status: string | null
  created_at?: string | null
}

type CalendarEventRow = {
  id: string
  vehicle_id: string | null
  booking_id: string | null
  event_type: string | null
  start_at: string | null
  end_at: string | null
  status: string | null
  maintenance_job_id?: string | null
}

type SalesPipelineStageRow = {
  id: string
  name: string | null
  kommo_status_id: string | null
}

type MaintenanceJobRow = {
  id: string
  vehicle_id: string | null
  job_type: string | null
  status: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  actual_start: string | null
  actual_end: string | null
  vendor: string | null
  location: string | null
}

export type DocumentRecord = {
  id: string
  name?: string
  type: string
  status?: string
  expiry?: string
  previewUrl?: string
  entityType: string
  entityLabel: string
  entityLink?: string
}

const DEFAULT_TIMEZONE = "Asia/Dubai"
const DEFAULT_CHANNEL = "Manual"
const AED = "AED"
const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const KOMMO_BASE_URL = process.env.NEXT_PUBLIC_KOMMO_BASE_URL || process.env.KOMMO_BASE_URL || ""
const DOCUMENT_URL_TTL_SECONDS = 60 * 60
const BOOKING_SELECT_COLUMNS =
  "id, external_code, client_id, vehicle_id, driver_id, owner_id, status, booking_type, channel, priority, start_at, end_at, total_amount, deposit_amount, created_at, updated_at, created_by, kommo_status_id, delivery_fee_label, delivery_location, collect_location, rental_duration_days, price_daily, insurance_fee_label, full_insurance_fee, advance_payment, sales_order_url, agreement_number, zoho_sales_order_id, sales_service_rating, sales_service_feedback, sales_service_rated_by, sales_service_rated_at, mileage_limit"

const fetchClientRows = cache(async (): Promise<ClientRow[]> => {
  const { data, error } = await serviceClient
    .from("clients")
    .select(CLIENT_SELECT_COLUMNS)
    .order("name", { ascending: true })
    .limit(500)
  if (error) {
    throw new Error(`[supabase] Failed to load clients: ${error.message}`)
  }
  return coerceRows<ClientRow>(data)
})

async function fetchClientRowsByIds(clientIds: string[]): Promise<ClientRow[]> {
  const uniqueIds = Array.from(new Set(clientIds.filter((id) => isUuidLike(id))))
  if (!uniqueIds.length) return []
  const { data, error } = await serviceClient.from("clients").select(CLIENT_SELECT_COLUMNS).in("id", uniqueIds)
  if (error) {
    throw new Error(`[supabase] Failed to load clients by id: ${error.message}`)
  }
  return coerceRows<ClientRow>(data)
}

async function fetchClientRowById(clientId: string): Promise<ClientRow | null> {
  const { data, error } = await serviceClient.from("clients").select(CLIENT_SELECT_COLUMNS).eq("id", clientId).maybeSingle()
  if (error) {
    if (isMissingTableError(error, "clients")) {
      return null
    }
    throw new Error(`[supabase] Failed to load client ${clientId}: ${error.message}`)
  }
  return coerceRow<ClientRow>(data)
}

const VEHICLE_SELECT_COLUMNS = [
  "id",
  "external_ref",
  "name",
  "make",
  "model",
  "vin",
  "plate_number",
  "status",
  "class",
  "body_style",
  "segment",
  "interior_color",
  "seating_capacity",
  "mileage_km",
  "utilization_pct",
  "revenue_ytd",
  "model_year",
  "exterior_color",
  "engine_displacement_l",
  "power_hp",
  "cylinders",
  "zero_to_hundred_sec",
  "transmission",
  "location",
  "image_url",
  "kommo_vehicle_id",
  "created_by",
  "updated_by",
  "updated_at",
  "created_at",
].join(", ")

const fetchVehicleRows = cache(async (): Promise<VehicleRow[]> => {
  const { data, error } = await serviceClient
    .from("vehicles")
    .select(VEHICLE_SELECT_COLUMNS)
    .order("name", { ascending: true })
    .limit(500)
  if (error) {
    throw new Error(`[supabase] Failed to load vehicles: ${error.message}`)
  }
  return coerceRows<VehicleRow>(data)
})

async function fetchVehicleRowsByIds(vehicleIds: string[]): Promise<VehicleRow[]> {
  if (!vehicleIds.length) return []
  const { data, error } = await serviceClient
    .from("vehicles")
    .select(VEHICLE_SELECT_COLUMNS)
    .in("id", vehicleIds)
  if (error) {
    throw new Error(`[supabase] Failed to load vehicles by id: ${error.message}`)
  }
  return coerceRows<VehicleRow>(data)
}

async function fetchVehicleRowById(vehicleId: string): Promise<VehicleRow | null> {
  const { data, error } = await serviceClient
    .from("vehicles")
    .select(VEHICLE_SELECT_COLUMNS)
    .eq("id", vehicleId)
    .maybeSingle()
  if (error) {
    throw new Error(`[supabase] Failed to load vehicle ${vehicleId}: ${error.message}`)
  }
  return coerceRow<VehicleRow>(data)
}

const fetchBookingRows = cache(async (): Promise<BookingRow[]> => {
  const { data, error } = await serviceClient
    .from("bookings")
    .select(BOOKING_SELECT_COLUMNS)
    .order("start_at", { ascending: false })
    .limit(2000)
  if (error) {
    throw new Error(`[supabase] Failed to load bookings: ${error.message}`)
  }
  return data ?? []
})

async function fetchBookingRowById(bookingId: string): Promise<BookingRow | null> {
  const { data, error } = await serviceClient
    .from("bookings")
    .select(BOOKING_SELECT_COLUMNS)
    .eq("id", bookingId)
    .maybeSingle()
  if (error) {
    throw new Error(`[supabase] Failed to load booking ${bookingId}: ${error.message}`)
  }
  return coerceRow<BookingRow>(data)
}

async function fetchBookingRowsByVehicleId(vehicleId: string): Promise<BookingRow[]> {
  if (!vehicleId) return []
  const { data, error } = await serviceClient
    .from("bookings")
    .select(BOOKING_SELECT_COLUMNS)
    .eq("vehicle_id", vehicleId)
    .order("start_at", { ascending: false })
    .limit(200)
  if (error) {
    throw new Error(`[supabase] Failed to load bookings for vehicle ${vehicleId}: ${error.message}`)
  }
  return data ?? []
}

const fetchSalesPipelineStageRows = cache(async (): Promise<SalesPipelineStageRow[]> => {
  const { data, error } = await serviceClient
    .from("sales_pipeline_stages")
    .select("id, name, kommo_status_id")
    .limit(500)
  if (error) {
    throw new Error(`[supabase] Failed to load sales pipeline stages: ${error.message}`)
  }
  return data ?? []
})

async function fetchBookingRowsByClientId(clientId: string): Promise<BookingRow[]> {
  const { data, error } = await serviceClient
    .from("bookings")
    .select(BOOKING_SELECT_COLUMNS)
    .eq("client_id", clientId)
    .order("start_at", { ascending: false })
  if (error) {
    throw new Error(`[supabase] Failed to load bookings for client ${clientId}: ${error.message}`)
  }
  return data ?? []
}

const fetchBookingInvoiceRows = cache(async (): Promise<BookingInvoiceRow[]> => {
  const { data, error } = await serviceClient
    .from("booking_invoices")
    .select("id, booking_id, label, invoice_type, amount, status, issued_at, due_at")
    .order("issued_at", { ascending: false, nullsFirst: false })
    .limit(1000)
  if (error) {
    throw new Error(`[supabase] Failed to load booking invoices: ${error.message}`)
  }
  return data ?? []
})

async function fetchBookingInvoiceRowsByBookingIds(bookingIds: string[]): Promise<BookingInvoiceRow[]> {
  if (!bookingIds.length) return []
  const { data, error } = await serviceClient
    .from("booking_invoices")
    .select("id, booking_id, label, invoice_type, amount, status, issued_at, due_at")
    .in("booking_id", bookingIds)
    .order("issued_at", { ascending: false, nullsFirst: false })
  if (error) {
    throw new Error(`[supabase] Failed to load booking invoices for client: ${error.message}`)
  }
  return data ?? []
}

const fetchDriverProfileRows = cache(async (): Promise<DriverProfileRow[]> => {
  const { data, error } = await serviceClient
    .from("driver_profiles")
    .select("id, status, staff_account_id")
    .limit(200)
  if (error) {
    throw new Error(`[supabase] Failed to load driver profiles: ${error.message}`)
  }
  return data ?? []
})

const fetchStaffRows = cache(async (): Promise<StaffRow[]> => {
  const { data, error } = await serviceClient.from("staff_accounts").select("id, full_name, role").limit(500)
  if (error) {
    throw new Error(`[supabase] Failed to load staff accounts: ${error.message}`)
  }
  return data ?? []
})

async function fetchStaffRowsByIds(staffIds: string[]): Promise<StaffRow[]> {
  const uniqueIds = Array.from(new Set(staffIds.filter((id) => isUuidLike(id))))
  if (!uniqueIds.length) return []
  const { data, error } = await serviceClient.from("staff_accounts").select("id, full_name, role").in("id", uniqueIds)
  if (error) {
    throw new Error(`[supabase] Failed to load staff accounts by id: ${error.message}`)
  }
  return coerceRows<StaffRow>(data)
}

export const getStaffAccounts = cache(async (): Promise<StaffRow[]> => {
  return fetchStaffRows()
})

const fetchDocumentLinkRows = cache(async (): Promise<DocumentLinkRow[]> => {
  const { data, error } = await serviceClient
    .from("document_links")
    .select(
      "id, document_id, scope, entity_id, doc_type, notes, metadata, document:documents(id, bucket, storage_path, file_name, original_name, mime_type, size_bytes, status, source, expires_at, metadata, created_at)"
    )
    .limit(2000)
  if (error) {
    throw new Error(`[supabase] Failed to load document links: ${error.message}`)
  }
  const rows = (data ?? []) as RawDocumentLinkRow[]
  return rows.map(normalizeDocumentLinkRow)
})

async function fetchDocumentLinkRowsByClientId(clientId: string): Promise<DocumentLinkRow[]> {
  const { data, error } = await serviceClient
    .from("document_links")
    .select(
      "id, document_id, scope, entity_id, doc_type, notes, metadata, document:documents(id, bucket, storage_path, file_name, original_name, mime_type, size_bytes, status, source, expires_at, metadata, created_at)"
    )
    .eq("entity_id", clientId)
    .in("scope", ["client"])
  if (error) {
    if (isMissingTableError(error, "document_links")) {
      return []
    }
    throw new Error(`[supabase] Failed to load document links for client ${clientId}: ${error.message}`)
  }
  const rows = (data ?? []) as RawDocumentLinkRow[]
  return rows.map(normalizeDocumentLinkRow)
}

async function fetchDocumentLinkRowsByBookingId(bookingId: string): Promise<DocumentLinkRow[]> {
  if (!bookingId) {
    return []
  }
  const { data, error } = await serviceClient
    .from("document_links")
    .select(
      "id, document_id, scope, entity_id, doc_type, notes, metadata, document:documents(id, bucket, storage_path, file_name, original_name, mime_type, size_bytes, status, source, expires_at, metadata, created_at)"
    )
    .eq("entity_id", bookingId)
    .in("scope", ["booking"])
  if (error) {
    if (isMissingTableError(error, "document_links")) {
      return []
    }
    throw new Error(`[supabase] Failed to load document links for booking ${bookingId}: ${error.message}`)
  }
  const rows = (data ?? []) as RawDocumentLinkRow[]
  return rows.map(normalizeDocumentLinkRow)
}

const fetchClientNotificationRows = cache(async (): Promise<ClientNotificationRow[]> => {
  const { data, error } = await serviceClient
    .from("client_notifications")
    .select("id, client_id, channel, subject, content, sent_at, status, created_at")
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(1000)
  if (error) {
    if (isMissingTableError(error, "client_notifications")) {
      return []
    }
    throw new Error(`[supabase] Failed to load client notifications: ${error.message}`)
  }
  return data ?? []
})

async function fetchClientNotificationRowsByClientId(clientId: string): Promise<ClientNotificationRow[]> {
  const { data, error } = await serviceClient
    .from("client_notifications")
    .select("id, client_id, channel, subject, content, sent_at, status, created_at")
    .eq("client_id", clientId)
    .order("sent_at", { ascending: false, nullsFirst: false })
  if (error) {
    if (isMissingTableError(error, "client_notifications")) {
      return []
    }
    throw new Error(`[supabase] Failed to load notifications for client ${clientId}: ${error.message}`)
  }
  return data ?? []
}

const fetchCalendarEventRows = cache(async (): Promise<CalendarEventRow[]> => {
  const { data, error } = await serviceClient
    .from("calendar_events_expanded")
    .select("id, vehicle_id, booking_id, event_type, start_at, end_at, status")
    .order("start_at", { ascending: true })
    .limit(1000)
  if (error) {
    throw new Error(`[supabase] Failed to load calendar events: ${error.message}`)
  }
  return data ?? []
})

const fetchMaintenanceJobRows = cache(async (): Promise<MaintenanceJobRow[]> => {
  const selectColumns =
    "id, vehicle_id, job_type, status, scheduled_start, scheduled_end, actual_start, actual_end, vendor, location"
  const { data, error } = await serviceClient
    .from("maintenance_jobs")
    .select(selectColumns)
    .order("scheduled_start", { ascending: false })
    .limit(1000)
  if (error) {
    if (isMissingTableError(error, "maintenance_jobs")) {
      return []
    }
    if (isMissingColumnError(error, "maintenance_jobs", "location")) {
      const fallback = await serviceClient
        .from("maintenance_jobs")
        .select("id, vehicle_id, job_type, status, scheduled_start, scheduled_end, actual_start, actual_end, vendor")
        .order("scheduled_start", { ascending: false })
        .limit(1000)
      if (fallback.error) {
        throw new Error(`[supabase] Failed to load maintenance jobs: ${fallback.error.message}`)
      }
      return (fallback.data ?? []).map((row) => ({ ...row, location: null })) as MaintenanceJobRow[]
    }
    throw new Error(`[supabase] Failed to load maintenance jobs: ${error.message}`)
  }
  return data ?? []
})

export const getLiveClients = cache(async (): Promise<Client[]> => {
  const [clientRows, bookingRows, vehicleRows, invoiceRows, documentLinks, notificationRows, staffRows] = await Promise.all([
    fetchClientRows(),
    fetchBookingRows(),
    fetchVehicleRows(),
    fetchBookingInvoiceRows(),
    fetchDocumentLinkRows(),
    fetchClientNotificationRows(),
    fetchStaffRows(),
  ])

  const vehiclesById = new Map<string, VehicleRow>()
  vehicleRows.forEach((row) => {
    vehiclesById.set(row.id, row)
  })

  const bookingsByClient = new Map<string, BookingRow[]>()
  bookingRows.forEach((row) => {
    if (!row.client_id) return
    const list = bookingsByClient.get(row.client_id) ?? []
    list.push(row)
    bookingsByClient.set(row.client_id, list)
  })

  const bookingById = new Map<string, BookingRow>()
  bookingRows.forEach((row) => bookingById.set(row.id, row))

  const paymentsByClient = new Map<string, ClientPayment[]>()
  invoiceRows.forEach((row) => {
    if (!row.booking_id) return
    const booking = bookingById.get(row.booking_id)
    if (!booking || !booking.client_id) return
    const list = paymentsByClient.get(booking.client_id) ?? []
    list.push(mapInvoiceToPayment(row))
    paymentsByClient.set(booking.client_id, list)
  })

  const documentsByClient = new Map<string, ClientDocument[]>()
  const mappedDocuments = await mapDocumentEntries(documentLinks)
  mappedDocuments.forEach(({ scope, entityId, document }) => {
    if (scope !== "client") return
    const list = documentsByClient.get(entityId) ?? []
    list.push(document)
    documentsByClient.set(entityId, list)
  })

  const notificationsByClient = new Map<string, ClientNotification[]>()
  notificationRows.forEach((row) => {
    const note = mapNotificationRow(row)
    const list = notificationsByClient.get(row.client_id) ?? []
    list.push(note)
    notificationsByClient.set(row.client_id, list)
  })

  const staffById = new Map<string, StaffRow>()
  staffRows.forEach((staff) => staffById.set(staff.id, staff))

  return clientRows.map((row) => {
    const clientBookings = bookingsByClient.get(row.id) ?? []
    const rentals = buildClientRentals(clientBookings, vehiclesById, 4)
    const lifetimeValue = clientBookings.reduce((sum, booking) => sum + numberOrZero(booking.total_amount), 0)
    const lastBookingDate = getLastBookingDate(clientBookings)
    return {
      id: row.id,
      name: row.name ?? "Unnamed client",
      firstName: row.first_name ?? undefined,
      lastName: row.last_name ?? undefined,
      middleName: row.middle_name ?? undefined,
      dateOfBirth: row.date_of_birth ?? undefined,
      nationality: row.nationality ?? undefined,
      address: row.address ?? undefined,
      documentNumber: row.document_number ?? undefined,
      issueDate: row.issue_date ?? undefined,
      expiryDate: row.expiry_date ?? undefined,
      issuingCountry: row.issuing_country ?? undefined,
      driverClass: row.driver_license_class ?? undefined,
      driverRestrictions: row.driver_license_restrictions ?? undefined,
      driverEndorsements: row.driver_license_endorsements ?? undefined,
      phone: row.phone ?? "—",
      email: row.email ?? "—",
      status: formatTier(row.tier),
      segment: formatSegment(row.segment),
      residencyCountry: row.residency_country ?? undefined,
      gender: formatGender(row.gender),
      kommoContactId: row.kommo_contact_id ?? undefined,
      kommoContactUrl: buildKommoContactUrl(row.kommo_contact_id),
      outstanding: numberOrZero(row.outstanding_amount),
      lifetimeValue,
      createdAt: row.created_at ?? undefined,
      createdBy: deriveClientAuditActor(row, staffById, "created"),
      updatedAt: row.updated_at ?? undefined,
      updatedBy: deriveClientAuditActor(row, staffById, "updated"),
      lastBookingDate,
      nps: row.nps_score ?? 0,
      documents: (documentsByClient.get(row.id) ?? []).slice(0, 5),
      rentals,
      payments: (paymentsByClient.get(row.id) ?? []).slice(0, 4),
      notifications: (notificationsByClient.get(row.id) ?? []).slice(0, 4),
      preferences: {
        notifications: buildPreferredChannels(row.preferred_channels),
        language: row.preferred_language ?? "en",
        timezone: row.timezone ?? DEFAULT_TIMEZONE,
      },
      documentRecognition: mapDocumentRecognition(row),
    }
  })
})

export const getLiveClientByIdFromDb = cache(async (clientId: string): Promise<Client | null> => {
  const clientRow = await fetchClientRowById(clientId)
  if (!clientRow) {
    return null
  }

  const bookingRows = await fetchBookingRowsByClientId(clientId)
  const bookingIds = bookingRows.map((booking) => booking.id)
  const vehicleIds = Array.from(
    new Set(bookingRows.map((booking) => booking.vehicle_id).filter((id): id is string => Boolean(id)))
  )

  const [vehicleRows, invoiceRows, documentRows, notificationRows, staffRows] = await Promise.all([
    fetchVehicleRowsByIds(vehicleIds),
    fetchBookingInvoiceRowsByBookingIds(bookingIds),
    fetchDocumentLinkRowsByClientId(clientId),
    fetchClientNotificationRowsByClientId(clientId),
    fetchStaffRows(),
  ])

  const vehiclesById = new Map<string, VehicleRow>()
  vehicleRows.forEach((vehicle) => {
    if (vehicle.id) {
      vehiclesById.set(vehicle.id, vehicle)
    }
  })

  const rentals = buildClientRentals(bookingRows, vehiclesById, undefined)
  const lifetimeValue = bookingRows.reduce((sum, booking) => sum + numberOrZero(booking.total_amount), 0)
  const lastBookingDate = getLastBookingDate(bookingRows)
  const documents = (await Promise.all(documentRows.map(mapDocumentLinkRow))).filter(Boolean) as ClientDocument[]
  const payments = invoiceRows.map(mapInvoiceToPayment).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  const notifications = notificationRows.map(mapNotificationRow).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))

  const staffById = new Map<string, StaffRow>()
  staffRows.forEach((staff) => staffById.set(staff.id, staff))

  return {
    id: clientRow.id,
    name: clientRow.name ?? "Unnamed client",
    firstName: clientRow.first_name ?? undefined,
    lastName: clientRow.last_name ?? undefined,
    middleName: clientRow.middle_name ?? undefined,
    dateOfBirth: clientRow.date_of_birth ?? undefined,
    nationality: clientRow.nationality ?? undefined,
    address: clientRow.address ?? undefined,
    documentNumber: clientRow.document_number ?? undefined,
    issueDate: clientRow.issue_date ?? undefined,
    expiryDate: clientRow.expiry_date ?? undefined,
    issuingCountry: clientRow.issuing_country ?? undefined,
    driverClass: clientRow.driver_license_class ?? undefined,
    driverRestrictions: clientRow.driver_license_restrictions ?? undefined,
    driverEndorsements: clientRow.driver_license_endorsements ?? undefined,
    phone: clientRow.phone ?? "—",
    email: clientRow.email ?? "—",
    status: formatTier(clientRow.tier),
    segment: formatSegment(clientRow.segment),
    residencyCountry: clientRow.residency_country ?? undefined,
    gender: formatGender(clientRow.gender),
    kommoContactId: clientRow.kommo_contact_id ?? undefined,
    kommoContactUrl: buildKommoContactUrl(clientRow.kommo_contact_id),
    outstanding: numberOrZero(clientRow.outstanding_amount),
    lifetimeValue,
    createdAt: clientRow.created_at ?? undefined,
    createdBy: deriveClientAuditActor(clientRow, staffById, "created"),
    updatedAt: clientRow.updated_at ?? undefined,
    updatedBy: deriveClientAuditActor(clientRow, staffById, "updated"),
    lastBookingDate,
    nps: clientRow.nps_score ?? 0,
    documents,
    rentals,
    payments,
    notifications,
    preferences: {
      notifications: buildPreferredChannels(clientRow.preferred_channels),
      language: clientRow.preferred_language ?? "en",
      timezone: clientRow.timezone ?? DEFAULT_TIMEZONE,
    },
    documentRecognition: mapDocumentRecognition(clientRow),
  }
})

export const getLiveClientById = cache(async (clientId: string): Promise<Client | null> => {
  const client = await getLiveClientByIdFromDb(clientId)
  if (client) {
    return client
  }
  const clients = await getLiveClients()
  return clients.find((item) => String(item.id) === clientId) ?? null
})

export const getClientNotifications = cache(async (clientId: string): Promise<ClientNotification[]> => {
  const rows = await fetchClientNotificationRows()
  return rows.filter((row) => row.client_id === clientId).map(mapNotificationRow)
})

export const getDocumentRecordById = cache(async (documentId: string): Promise<DocumentRecord | null> => {
  const { data, error } = await serviceClient
    .from("document_links")
    .select("id, document_id, scope, entity_id, metadata, document:documents(id, bucket, storage_path, file_name, mime_type, created_at)")
    .eq("document_id", documentId)
    .maybeSingle()
  if (error) {
    throw new Error(`[supabase] Failed to load document ${documentId}: ${error.message}`)
  }
  if (!data) {
    return null
  }
  const normalized = normalizeDocumentLinkRow({ ...data, document_id: documentId } as RawDocumentLinkRow)
  const doc = await mapDocumentLinkRow(normalized)
  if (!doc) {
    return null
  }
  const entity = await resolveDocumentEntity(data.scope, data.entity_id)
  return {
    id: doc.id,
    name: doc.name,
    type: doc.type,
    status: doc.status,
    expiry: doc.expiry,
    previewUrl: doc.url,
    entityType: entity.type,
    entityLabel: entity.label,
    entityLink: entity.link,
  }
})

export const getLiveFleetVehicles = cache(async (): Promise<FleetCar[]> => {
  const [rows, staffRows] = await Promise.all([fetchVehicleRows(), fetchStaffRows()])
  const staffById = new Map<string, StaffRow>()
  staffRows.forEach((staff) => staffById.set(staff.id, staff))
  return rows.map((row) => mapVehicleRow(row, { staffById }))
})

export async function getLiveFleetVehicleById(vehicleId: string): Promise<FleetCar | null> {
  noStore()
  if (!vehicleId) {
    return null
  }
  const [row, staffRows] = await Promise.all([fetchVehicleRowById(vehicleId), fetchStaffRows()])
  if (!row) return null
  const staffById = new Map<string, StaffRow>()
  staffRows.forEach((staff) => staffById.set(staff.id, staff))
  return mapVehicleRow(row, { staffById })
}

export async function getLiveBookingsByVehicleId(vehicleId: string): Promise<Booking[]> {
  noStore()
  if (!vehicleId) {
    return []
  }

  const bookingRows = await fetchBookingRowsByVehicleId(vehicleId)
  if (!bookingRows.length) {
    return []
  }

  const clientIds = new Set<string>()
  const staffIds = new Set<string>()
  bookingRows.forEach((row) => {
    if (row.client_id) clientIds.add(row.client_id)
    if (row.owner_id) staffIds.add(row.owner_id)
    if (row.created_by) staffIds.add(row.created_by)
  })

  const bookingIds = bookingRows.map((row) => row.id)
  const [clientRows, vehicleRow, invoiceRows, staffRows, pipelineStageRows] = await Promise.all([
    fetchClientRowsByIds(Array.from(clientIds)),
    fetchVehicleRowById(vehicleId),
    fetchBookingInvoiceRowsByBookingIds(bookingIds),
    fetchStaffRowsByIds(Array.from(staffIds)),
    fetchSalesPipelineStageRows(),
  ])

  const clientsById = new Map<string, ClientRow>()
  clientRows.forEach((row) => clientsById.set(row.id, row))

  const vehiclesById = new Map<string, VehicleRow>()
  if (vehicleRow) {
    vehiclesById.set(vehicleRow.id, vehicleRow)
  }

  const staffById = new Map<string, StaffRow>()
  staffRows.forEach((row) => staffById.set(row.id, row))

  const invoicesByBooking = new Map<string, BookingInvoice[]>()
  invoiceRows.forEach((row) => {
    if (!row.booking_id) return
    const list = invoicesByBooking.get(row.booking_id) ?? []
    list.push(mapInvoiceRow(row))
    invoicesByBooking.set(row.booking_id, list)
  })

  const stageByKommoStatusId = new Map<string, SalesPipelineStageRow>()
  pipelineStageRows.forEach((row) => {
    if (!row.kommo_status_id) return
    stageByKommoStatusId.set(String(row.kommo_status_id), row)
  })

  return bookingRows.map((row) =>
    mapBookingRow(row, { clientsById, vehiclesById, staffById, invoicesByBooking, stageByKommoStatusId })
  )
}

export const getLiveBookings = cache(async (): Promise<Booking[]> => {
  const [bookingRows, clientRows, vehicleRows, invoiceRows, staffRows, pipelineStageRows] = await Promise.all([
    fetchBookingRows(),
    fetchClientRows(),
    fetchVehicleRows(),
    fetchBookingInvoiceRows(),
    fetchStaffRows(),
    fetchSalesPipelineStageRows(),
  ])

  const clientsById = new Map<string, ClientRow>()
  clientRows.forEach((row) => clientsById.set(row.id, row))

  const vehiclesById = new Map<string, VehicleRow>()
  vehicleRows.forEach((row) => vehiclesById.set(row.id, row))

  const staffById = new Map<string, StaffRow>()
  staffRows.forEach((row) => staffById.set(row.id, row))

  const invoicesByBooking = new Map<string, BookingInvoice[]>()
  invoiceRows.forEach((row) => {
    if (!row.booking_id) return
    const list = invoicesByBooking.get(row.booking_id) ?? []
    list.push(mapInvoiceRow(row))
    invoicesByBooking.set(row.booking_id, list)
  })

  const stageByKommoStatusId = new Map<string, SalesPipelineStageRow>()
  pipelineStageRows.forEach((row) => {
    if (!row.kommo_status_id) return
    stageByKommoStatusId.set(String(row.kommo_status_id), row)
  })

  return bookingRows.map((row) =>
    mapBookingRow(row, { clientsById, vehiclesById, staffById, invoicesByBooking, stageByKommoStatusId })
  )
})

export const getLiveBookingById = cache(async (bookingId: string): Promise<Booking | null> => {
  const row = await fetchBookingRowById(bookingId)
  if (!row) return null

  const [clientRow, vehicleRow, invoiceRows, staffRows, pipelineStageRows] = await Promise.all([
    row.client_id ? fetchClientRowById(row.client_id) : Promise.resolve(null),
    row.vehicle_id ? fetchVehicleRowById(row.vehicle_id) : Promise.resolve(null),
    fetchBookingInvoiceRowsByBookingIds([bookingId]),
    fetchStaffRows(),
    fetchSalesPipelineStageRows(),
  ])

  const clientsById = new Map<string, ClientRow>()
  if (clientRow) clientsById.set(clientRow.id, clientRow)

  const vehiclesById = new Map<string, VehicleRow>()
  if (vehicleRow) vehiclesById.set(vehicleRow.id, vehicleRow)

  const staffById = new Map<string, StaffRow>()
  staffRows.forEach((s) => staffById.set(s.id, s))

  const invoicesByBooking = new Map<string, BookingInvoice[]>()
  if (invoiceRows.length > 0) {
    invoicesByBooking.set(bookingId, invoiceRows.map(mapInvoiceRow))
  }

  const stageByKommoStatusId = new Map<string, SalesPipelineStageRow>()
  pipelineStageRows.forEach((s) => {
    if (s.kommo_status_id) stageByKommoStatusId.set(String(s.kommo_status_id), s)
  })

  return mapBookingRow(row, {
    clientsById,
    vehiclesById,
    staffById,
    invoicesByBooking,
    stageByKommoStatusId,
  })
})

export const getBookingDocuments = cache(async (bookingId: string): Promise<BookingDocument[]> => {
  if (!bookingId) {
    return []
  }
  const rows = await fetchDocumentLinkRowsByBookingId(bookingId)
  const mapped = await Promise.all(rows.map((row) => mapBookingDocumentRow(row)))
  return mapped.filter((doc): doc is BookingDocument => Boolean(doc))
})

export const getLiveDrivers = cache(async (): Promise<Driver[]> => {
  const [driverRows, staffRows] = await Promise.all([fetchDriverProfileRows(), fetchStaffRows()])
  const staffById = new Map<string, StaffRow>()
  staffRows.forEach((row) => staffById.set(row.id, row))
  return driverRows.map((row) => ({
    id: row.id,
    name: staffById.get(row.staff_account_id ?? "")?.full_name ?? `Driver ${row.id.slice(0, 6)}`,
    status: mapDriverStatus(row.status),
  }))
})

const FLEET_CALENDAR_EXCLUDED_STATUSES = new Set<FleetCar["status"]>(["Sold", "Service Car"])

export const getFleetCalendarData = cache(async (): Promise<{ vehicles: FleetCar[]; bookings: Booking[]; events: CalendarEvent[] }> => {
  const [vehicles, bookings, calendarRows, maintenanceRows] = await Promise.all([
    getLiveFleetVehicles(),
    getLiveBookings(),
    fetchCalendarEventRows(),
    fetchMaintenanceJobRows(),
  ])

  const filteredVehicles = vehicles.filter((vehicle) => !FLEET_CALENDAR_EXCLUDED_STATUSES.has(vehicle.status))
  const allowedVehicleIds = new Set(filteredVehicles.map((vehicle) => String(vehicle.id)))
  const filteredBookings = bookings.filter((booking) => allowedVehicleIds.has(String(booking.carId)))
  const events = buildFleetCalendarEvents({
    vehicles: filteredVehicles,
    bookings: filteredBookings,
    calendarRows,
    maintenanceRows,
  }).filter((event) => allowedVehicleIds.has(String(event.carId)))

  return { vehicles: filteredVehicles, bookings: filteredBookings, events }
})

export async function getFleetDirectoryData(): Promise<{ vehicles: FleetCar[]; bookings: Booking[] }> {
  const [vehicles, bookings] = await Promise.all([getLiveFleetVehicles(), getLiveBookings()])
  return { vehicles, bookings }
}

function mapVehicleRow(row: VehicleRow, options?: { staffById?: Map<string, StaffRow> }): FleetCar {
  const utilization = normalizeRatio(row.utilization_pct)
  const updatedAt = row.updated_at ?? row.created_at ?? new Date().toISOString()
  const nextServiceDate = new Date(updatedAt)
  nextServiceDate.setDate(nextServiceDate.getDate() + 45)
  const location = row.location ?? "SkyLuxse HQ"
  const staffById = options?.staffById
  const createdBy = resolveStaffActorById(staffById, row.created_by) ?? (row.kommo_vehicle_id ? "Kommo import" : undefined)
  const updatedBy = resolveStaffActorById(staffById, row.updated_by) ?? createdBy
  return {
    id: row.id,
    name: row.name ?? "Unnamed vehicle",
    make: row.make ?? row.name?.split(" ")[0] ?? "—",
    model: row.model ?? row.name ?? undefined,
    vin: row.vin ?? undefined,
    plate: row.plate_number ?? "—",
    status: mapVehicleStatus(row.status),
    class: row.class ?? "Class",
    bodyStyle: row.body_style ?? "Body type",
    color: row.exterior_color ?? "Black",
    year: row.model_year ?? new Date(updatedAt).getFullYear(),
    seatingCapacity: row.seating_capacity ?? undefined,
    mileage: row.mileage_km ?? 0,
    utilization,
    revenueYTD: numberOrZero(row.revenue_ytd),
    engineDisplacementL: row.engine_displacement_l ?? undefined,
    powerHp: row.power_hp ?? undefined,
    zeroToHundredSec: row.zero_to_hundred_sec ?? undefined,
    transmission: row.transmission ?? undefined,
    interiorColor: row.interior_color ?? undefined,
    cylinders: row.cylinders ?? undefined,
    insuranceExpiry: undefined,
    mulkiyaExpiry: undefined,
    location,
    serviceStatus: {
      label: "Service schedule",
      lastService: updatedAt,
      nextService: nextServiceDate.toISOString(),
      mileageToService: Math.max(0, 10000 - ((row.mileage_km ?? 0) % 10000)),
    },
    documents: [],
    reminders: [],
    documentGallery: [],
    maintenanceHistory: [],
    imageUrl: row.image_url ?? undefined,
    kommoVehicleId: row.kommo_vehicle_id ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    createdBy,
    updatedBy,
  }
}

function mapBookingRow(
  row: BookingRow,
  context: {
    clientsById: Map<string, ClientRow>
    vehiclesById: Map<string, VehicleRow>
    staffById: Map<string, StaffRow>
    invoicesByBooking: Map<string, BookingInvoice[]>
    stageByKommoStatusId: Map<string, SalesPipelineStageRow>
  }
): Booking {
  const start = row.start_at ?? new Date().toISOString()
  const end = row.end_at ?? start
  const client = row.client_id ? context.clientsById.get(row.client_id) : null
  const vehicle = row.vehicle_id ? context.vehiclesById.get(row.vehicle_id) : null
  const owner = row.owner_id ? context.staffById.get(row.owner_id) : null
  const invoices = context.invoicesByBooking.get(row.id) ?? []
  const createdBy = resolveAuditActor(row.created_by, owner?.full_name)
  const updatedBy = resolveAuditActor(undefined, owner?.full_name)
  const salesService = mapSalesService(row)
  const stageEntry =
    row.kommo_status_id != null ? context.stageByKommoStatusId.get(String(row.kommo_status_id)) : undefined
  const pricingTotals = computeBookingTotals({
    dailyRate: row.price_daily,
    durationDays: row.rental_duration_days,
    deliveryFeeLabel: row.delivery_fee_label,
    insuranceFeeLabel: row.insurance_fee_label,
    insuranceFeeAmount: row.full_insurance_fee,
    depositOptionLabel: row.insurance_fee_label,
  })
  const totalAmount = pricingTotals?.total ?? numberOrZero(row.total_amount)
  const paidAmount = numberOrZero(row.advance_payment ?? row.deposit_amount ?? 0)
  const billing = pricingTotals
    ? {
      base: pricingTotals.base,
      addons: pricingTotals.insuranceFee,
      fees: pricingTotals.deliveryFee + pricingTotals.depositFee,
      discounts: 0,
      currency: AED,
      vatRate: DEFAULT_VAT_RATE,
    }
    : {
      base: numberOrZero(row.total_amount),
      addons: 0,
      fees: 0,
      discounts: 0,
      currency: AED,
    }
  return {
    id: row.id,
    code: row.external_code ?? formatFallbackCode(row.id),
    clientId: row.client_id ?? row.id,
    clientName: client?.name ?? "Unassigned",
    carId: row.vehicle_id ?? row.id,
    carName: vehicle?.name ?? "Unassigned vehicle",
    carPlate: vehicle?.plate_number ?? undefined,
    startDate: start,
    endDate: end,
    startTime: start,
    endTime: end,
    driverId: row.driver_id ?? null,
    status: mapBookingStatus(row.status),
    totalAmount,
    paidAmount,
    deposit: numberOrZero(row.deposit_amount),
    priority: mapPriority(row.priority),
    type: mapBookingType(row.booking_type),
    channel: row.channel ?? DEFAULT_CHANNEL,
    ownerId: row.owner_id ?? "unassigned",
    ownerName: owner?.full_name ?? undefined,
    segment: client ? formatSegment(client.segment) : "Unknown",
    targetTime: Date.parse(end) || Date.parse(start) || null,
    serviceLevel: row.start_at
      ? {
        slaMinutes: 180,
        promisedAt: end,
        actualAt: null,
      }
      : undefined,
    addons: [],
    tags: [],
    deliveryFeeLabel: row.delivery_fee_label ?? undefined,
    deliveryLocation: row.delivery_location ?? undefined,
    collectLocation: row.collect_location ?? undefined,
    rentalDurationDays: row.rental_duration_days ?? undefined,
    priceDaily: row.price_daily ?? undefined,
    insuranceFeeLabel: row.insurance_fee_label ?? undefined,
    fullInsuranceFee: row.full_insurance_fee ?? undefined,
    advancePayment: row.advance_payment ?? undefined,
    salesOrderUrl: row.sales_order_url ?? undefined,

    agreementNumber: row.agreement_number ?? undefined,
    zohoSalesOrderId: row.zoho_sales_order_id ?? undefined,
    mileageLimit: row.mileage_limit ?? undefined,
    timeline: [],
    salesService,
    billing,
    pickupMileage: undefined,
    pickupFuel: undefined,
    returnMileage: undefined,
    returnFuel: undefined,
    documents: [],
    invoices,
    history: [],
    extensions: [],
    kommoStatusId: row.kommo_status_id ?? undefined,
    pipelineStageId: stageEntry?.id ?? undefined,
    pipelineStageName: stageEntry?.name ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    createdBy,
    updatedBy,
  }
}

function mapSalesService(row: BookingRow): Booking["salesService"] | undefined {
  const rating = row.sales_service_rating ?? undefined
  const feedback = row.sales_service_feedback ?? undefined
  const ratedBy = row.sales_service_rated_by ?? undefined
  const ratedAt = row.sales_service_rated_at ?? undefined

  if (rating == null && !feedback && !ratedBy && !ratedAt) {
    return undefined
  }

  return {
    rating,
    feedback,
    ratedBy,
    ratedAt,
  }
}

function mapInvoiceRow(row: BookingInvoiceRow): BookingInvoice {
  return {
    id: row.id,
    label: row.label ?? row.invoice_type ?? "Invoice",
    amount: numberOrZero(row.amount),
    status: row.status ?? "pending",
    issuedDate: row.issued_at ?? undefined,
    dueDate: row.due_at ?? undefined,
    scope: row.invoice_type ?? undefined,
  }
}

function mapInvoiceToPayment(row: BookingInvoiceRow): ClientPayment {
  return {
    id: row.id,
    type: row.invoice_type ?? "invoice",
    amount: numberOrZero(row.amount),
    status: row.status ?? "pending",
    channel: "Invoice",
    date: row.issued_at ?? new Date().toISOString(),
  }
}

function getLastBookingDate(bookings: BookingRow[]): string | undefined {
  const latest = bookings.reduce((max, booking) => {
    const reference = booking.start_at ?? booking.end_at ?? booking.created_at ?? booking.updated_at ?? null
    if (!reference) return max
    const timestamp = Date.parse(reference)
    if (Number.isNaN(timestamp)) return max
    return Math.max(max, timestamp)
  }, 0)
  return latest > 0 ? new Date(latest).toISOString() : undefined
}

function buildClientRentals(bookings: BookingRow[], vehiclesById: Map<string, VehicleRow>, limit?: number): ClientRental[] {
  const sorted = bookings.sort((a, b) => (b.start_at ?? "").localeCompare(a.start_at ?? ""))
  const subset = typeof limit === "number" ? sorted.slice(0, limit) : sorted
  return subset
    .map((booking) => {
      const vehicle = booking.vehicle_id ? vehiclesById.get(booking.vehicle_id) : null
      const start = booking.start_at ?? new Date().toISOString()
      const end = booking.end_at ?? start
      return {
        bookingId: booking.id,
        bookingCode: booking.external_code ?? undefined,
        status: mapRentalStatus(booking.status),
        startDate: start,
        endDate: end,
        carName: vehicle?.name ?? "Unassigned vehicle",
        totalAmount: numberOrZero(booking.total_amount),
      }
    })
}

function mapBookingStatus(value: string | null): Booking["status"] {
  const normalized = (value ?? "").toLowerCase()
  switch (normalized) {
    case "lead":
      return "new"
    case "confirmed":
      return "preparation"
    case "delivery":
      return "delivery"
    case "in_progress":
      return "in-rent"
    case "completed":
      return "settlement"
    default:
      return "settlement"
  }
}

function mapRentalStatus(status: string | null): string {
  const bookingStatus = mapBookingStatus(status)
  if (bookingStatus === "in-rent") return "active"
  if (bookingStatus === "settlement") return "completed"
  return "scheduled"
}

function mapBookingType(value: string | null): Booking["type"] {
  const normalized = (value ?? "rental").toLowerCase()
  if (normalized === "vip" || normalized === "short" || normalized === "corporate") {
    return normalized as Booking["type"]
  }
  if (normalized === "chauffeur" || normalized === "transfer") {
    return normalized as Booking["type"]
  }
  return "rental"
}

function mapPriority(value: string | null): Booking["priority"] {
  const normalized = (value ?? "medium").toLowerCase()
  if (normalized === "low" || normalized === "medium") return normalized as Booking["priority"]
  return "high"
}

function mapDriverStatus(value: string | null): Driver["status"] {
  switch ((value ?? "available").toLowerCase()) {
    case "on_task":
      return "On Task"
    case "standby":
      return "Standby"
    default:
      return "Available"
  }
}

function mapVehicleStatus(value: string | null): FleetCar["status"] {
  const normalized = (value ?? "available").trim().toLowerCase().replace(/[-\s]+/g, "_")
  if (normalized === "maintenance") return "Maintenance"
  if (normalized === "in_rent") return "In Rent"
  if (normalized === "reserved") return "Reserved"
  if (normalized === "sold") return "Sold"
  if (normalized === "service_car" || normalized === "service_cars") return "Service Car"
  return "Available"
}

function deriveClientAuditActor(row: ClientRow, staffById: Map<string, StaffRow> | undefined, kind: "created" | "updated"): string | undefined {
  const staffId = kind === "created" ? row.created_by : row.updated_by
  const staffName = resolveStaffActorById(staffById, staffId)
  if (staffName) {
    return staffName
  }
  if (kind === "updated") {
    const createdFallback = resolveStaffActorById(staffById, row.created_by)
    if (createdFallback) {
      return createdFallback
    }
  }
  if (row.kommo_contact_id) {
    return "Kommo import"
  }
  return undefined
}

function formatTier(value: string | null): string {
  const tier = (value ?? "vip").toLowerCase()
  if (tier === "vip") return "VIP"
  if (tier === "gold") return "Gold"
  if (tier === "silver") return "Silver"
  return titleCase(value) || "VIP"
}

function resolveAuditActor(primary?: string | null, fallback?: string | null): string | undefined {
  const value = primary ?? fallback
  if (!value) return undefined
  return titleCase(value)
}

function resolveStaffActorById(map: Map<string, StaffRow> | undefined, staffId?: string | null): string | undefined {
  if (!staffId) return undefined
  const record = map?.get(staffId)
  const name = record?.full_name?.trim()
  return name && name.length ? name : undefined
}

function formatSegment(value: string | null): string {
  return (value ?? "general").toLowerCase()
}

function formatGender(value: string | null): string | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined
  if (normalized === "male") return "Male"
  if (normalized === "female") return "Female"
  return titleCase(value)
}

function buildPreferredChannels(values: string[] | null): string[] {
  const entries = Array.isArray(values) && values.length ? values : ["email"]
  return entries.map((entry) => titleCase(entry) || entry)
}

function numberOrZero(value: number | string | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isUuidLike(value: string | null | undefined): boolean {
  if (!value) return false
  const normalized = value.trim()
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(normalized)
}

function buildKommoContactUrl(contactId?: string | null): string | undefined {
  if (!contactId || !KOMMO_BASE_URL) return undefined
  try {
    const base = new URL(KOMMO_BASE_URL)
    const normalizedPath = base.pathname.endsWith("/") ? base.pathname.slice(0, -1) : base.pathname
    base.pathname = `${normalizedPath}/contacts/detail/${contactId}`
    base.search = ""
    base.hash = ""
    return base.toString()
  } catch {
    return undefined
  }
}

function coerceRows<T>(data: unknown[] | null): T[] {
  return (data ?? []) as T[]
}

function coerceRow<T>(data: unknown | null): T | null {
  return data ? (data as T) : null
}

function normalizeRatio(value: number | null): number {
  if (value == null) return 0
  const normalized = value > 1 ? value / 100 : value
  return Math.min(Math.max(normalized, 0), 1)
}

function titleCase(value: string | null | undefined): string {
  if (!value) return ""
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}

function formatFallbackCode(id: string): string {
  return `BK-${id.slice(0, 6).toUpperCase()}`
}

async function mapBookingDocumentRow(row: DocumentLinkRow): Promise<BookingDocument | null> {
  const base = await mapDocumentLinkRow(row)
  if (!base) return null
  return {
    type: base.type,
    status: base.status ?? "active",
    url: base.url,
    name: base.name,
  }
}

async function mapDocumentEntries(
  rows: DocumentLinkRow[]
): Promise<Array<{ scope: string; entityId: string; document: ClientDocument }>> {
  const mapped = await Promise.all(
    rows.map(async (row) => {
      const document = await mapDocumentLinkRow(row)
      if (!document) return null
      return {
        scope: (row.scope ?? "").toLowerCase(),
        entityId: row.entity_id,
        document,
      }
    })
  )
  return mapped.filter((entry): entry is { scope: string; entityId: string; document: ClientDocument } => Boolean(entry))
}

async function mapDocumentLinkRow(row: DocumentLinkRow): Promise<ClientDocument | null> {
  if (!row.document) return null
  const linkMetadata = (row.metadata ?? {}) as Record<string, any>
  const documentMetadata = (row.document.metadata ?? {}) as Record<string, any>
  const bucket = row.document.bucket ?? "documents"
  const storagePath = row.document.storage_path ?? row.document.file_name ?? undefined
  const rawType =
    (linkMetadata.type as string | undefined) ??
    (linkMetadata.doc_type as string | undefined) ??
    (row.doc_type as string | undefined) ??
    (documentMetadata.type as string | undefined) ??
    row.scope ??
    "document"
  const status =
    (linkMetadata.status as string | undefined) ??
    (documentMetadata.status as string | undefined) ??
    row.document.status ??
    "active"
  const expiry =
    (linkMetadata.expiry as string | undefined) ??
    (linkMetadata.expires_at as string | undefined) ??
    (documentMetadata.expiry as string | undefined) ??
    (documentMetadata.expires_at as string | undefined) ??
    row.document.expires_at ??
    undefined
  const name =
    (linkMetadata.name as string | undefined) ??
    row.document.original_name ??
    row.document.file_name ??
    rawType ??
    "Document"
  const docNumber =
    (linkMetadata.number as string | undefined) ?? (documentMetadata.number as string | undefined) ?? undefined
  const url = await buildStorageAccessUrl(bucket, storagePath)
  return {
    id: row.document.id,
    type: titleCase(rawType),
    name,
    status,
    expiry,
    url,
    number: docNumber,
  }
}

function normalizeDocumentLinkRow(row: RawDocumentLinkRow): DocumentLinkRow {
  const document = Array.isArray(row.document) ? row.document[0] ?? null : row.document
  return { ...row, document }
}

function mapNotificationRow(row: ClientNotificationRow): ClientNotification {
  return {
    id: row.id,
    channel: row.channel ?? "email",
    subject: row.subject ?? "Notification",
    date: row.sent_at ?? row.created_at ?? new Date().toISOString(),
    status: row.status ?? "sent",
  }
}

function mapDocumentRecognition(row: ClientRow): Client["documentRecognition"] | undefined {
  const hasData =
    row.doc_status ||
    row.doc_raw ||
    row.doc_document_id

  if (!hasData) return undefined

  return {
    status: row.doc_status ?? undefined,
    confidence: row.doc_confidence ?? undefined,
    model: row.doc_model ?? undefined,
    documentId: row.doc_document_id ?? undefined,
    docType: row.doc_type ?? undefined,
    processedAt: row.doc_processed_at ?? undefined,
    error: row.doc_error ?? undefined,
    raw: row.doc_raw ?? undefined,
  }
}

export function buildStoragePublicUrl(bucket?: string | null, path?: string | null): string | undefined {
  if (!SUPABASE_PUBLIC_URL || !bucket || !path) return undefined
  const normalizedPath = path.replace(/^\/+/, "")
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/${bucket}/${normalizedPath}`
}

async function buildStorageAccessUrl(bucket?: string | null, path?: string | null): Promise<string | undefined> {
  if (!bucket || !path) return undefined
  const normalizedPath = path.replace(/^\/+/, "")
  try {
    const { data, error } = await serviceClient.storage
      .from(bucket)
      .createSignedUrl(normalizedPath, DOCUMENT_URL_TTL_SECONDS)
    if (error) {
      console.warn(`[supabase] Failed to sign document URL for ${bucket}/${normalizedPath}: ${error.message}`)
      return buildStoragePublicUrl(bucket, normalizedPath)
    }
    const signedUrl = data?.signedUrl
    if (!signedUrl) {
      return buildStoragePublicUrl(bucket, normalizedPath)
    }
    if (signedUrl.startsWith("http") || !SUPABASE_PUBLIC_URL) {
      return signedUrl
    }
    return `${SUPABASE_PUBLIC_URL}${signedUrl}`
  } catch (error) {
    console.warn("[supabase] Unexpected error while signing document URL", { bucket, path: normalizedPath, error })
    return buildStoragePublicUrl(bucket, normalizedPath)
  }
}

function buildFleetCalendarEvents(params: {
  vehicles: FleetCar[]
  bookings: Booking[]
  calendarRows: CalendarEventRow[]
  maintenanceRows: MaintenanceJobRow[]
}): CalendarEvent[] {
  const vehiclesById = new Map<string, FleetCar>()
  params.vehicles.forEach((vehicle) => vehiclesById.set(String(vehicle.id), vehicle))

  const bookingsById = new Map<string, Booking>()
  params.bookings.forEach((booking) => bookingsById.set(String(booking.id), booking))

  const calendarEvents = params.calendarRows.map((row) =>
    mapCalendarEventRow(row, { vehiclesById, bookingsById })
  )

  const maintenanceEvents = params.maintenanceRows.map((row) => mapMaintenanceJobRow(row, vehiclesById))

  return [...calendarEvents, ...maintenanceEvents].filter(Boolean) as CalendarEvent[]
}

function mapCalendarEventRow(
  row: CalendarEventRow,
  context: { vehiclesById: Map<string, FleetCar>; bookingsById: Map<string, Booking> }
): CalendarEvent {
  const booking = row.booking_id ? context.bookingsById.get(row.booking_id) : undefined
  const vehicle = row.vehicle_id ? context.vehiclesById.get(row.vehicle_id) : undefined
  const title =
    booking?.clientName ??
    booking?.code ??
    vehicle?.name ??
    titleCase(row.event_type) ??
    "Calendar event"
  const start = row.start_at ?? booking?.startDate ?? new Date().toISOString()
  const end = row.end_at ?? booking?.endDate ?? start
  return {
    id: row.id,
    carId: row.vehicle_id ?? booking?.carId ?? row.id,
    bookingId: booking?.id ?? row.booking_id ?? null,
    type: mapCalendarEventType(row.event_type, booking),
    title,
    start,
    end,
    priority: booking?.priority ?? "medium",
    bookingStatus: booking?.status ?? null,
    stageLabel: booking?.pipelineStageName,
    kommoStatusId: booking?.kommoStatusId ?? null,
  }
}

function mapMaintenanceJobRow(row: MaintenanceJobRow, vehiclesById: Map<string, FleetCar>): CalendarEvent | null {
  const start =
    row.scheduled_start ?? row.actual_start ?? row.scheduled_end ?? row.actual_end
  if (!start) return null
  const vehicle = row.vehicle_id ? vehiclesById.get(row.vehicle_id) : undefined
  const end = row.scheduled_end ?? row.actual_end ?? start
  const typeLabel = titleCase(row.job_type) || "Maintenance"
  const locationLabel = row.location?.trim()
  const baseTitle = vehicle ? `${vehicle.name} · ${typeLabel}` : `${typeLabel} ${row.id}`
  return {
    id: `maintenance-job-${row.id}`,
    carId: row.vehicle_id ?? row.id,
    type: mapMaintenanceJobType(row.job_type),
    title: locationLabel ? `${typeLabel} · ${locationLabel}` : baseTitle,
    start,
    end,
    priority: "medium",
    bookingStatus: null,
    stageLabel: locationLabel ?? row.vendor ?? undefined,
  }
}

const RESERVATION_KOMMO_STATUS_IDS = new Set([
  79790631,
  91703923,
  96150292,
  75440391,
])

function mapCalendarEventType(value: string | null | undefined, booking?: Booking): CalendarEvent["type"] {
  const normalized = (value ?? "rental").toLowerCase()
  if (normalized === "maintenance") return "maintenance"
  if (normalized === "repair") return "repair"
  if (normalized === "booking" || normalized === "rental") {
    return isReservationBooking(booking) ? "reservation" : "rental"
  }
  return "rental"
}

function isReservationBooking(booking?: Booking): boolean {
  if (!booking) return false
  const stageId = booking.kommoStatusId
  if (stageId == null) return false
  const normalized = Number(stageId)
  if (!Number.isFinite(normalized)) return false
  return RESERVATION_KOMMO_STATUS_IDS.has(normalized)
}

function mapMaintenanceJobType(value: string | null | undefined): CalendarEvent["type"] {
  const normalized = (value ?? "maintenance").toLowerCase()
  if (normalized === "repair") return "repair"
  return "maintenance"
}

function isMissingColumnError(error: { message?: string }, table: string, column: string) {
  const message = error.message?.toLowerCase() ?? ""
  const col = column.toLowerCase()
  const tbl = table.toLowerCase()
  return (
    message.includes(`column ${col} does not exist`) ||
    message.includes(`column "${col}" does not exist`) ||
    message.includes(`column ${tbl}.${col} does not exist`) ||
    message.includes(`column "${tbl}.${col}" does not exist`)
  )
}

function isMissingTableError(error: { message: string; code?: string | number }, table: string) {
  const message = error.message?.toLowerCase() ?? ""
  if (error.code && String(error.code) === "PGRST203") return true
  const normalizedTable = table.toLowerCase()
  return (
    message.includes(`table '${normalizedTable}`) ||
    message.includes(`table 'public.${normalizedTable}`) ||
    message.includes(`relation ${normalizedTable}`) ||
    message.includes(`relation public.${normalizedTable}`)
  )
}

async function resolveDocumentEntity(scope: string | null | undefined, entityId: string): Promise<{
  label: string
  type: string
  link?: string
}> {
  const normalized = (scope ?? "record").toLowerCase()
  try {
    switch (normalized) {
      case "client": {
        const { data } = await serviceClient
          .from("clients")
          .select("id, name")
          .eq("id", entityId)
          .maybeSingle()
        return {
          type: "Client",
          label: data?.name ?? "Client",
          link: `/clients/${entityId}`,
        }
      }
      case "vehicle": {
        const { data } = await serviceClient
          .from("vehicles")
          .select("id, name")
          .eq("id", entityId)
          .maybeSingle()
        return {
          type: "Vehicle",
          label: data?.name ?? "Vehicle",
          link: `/fleet/${entityId}`,
        }
      }
      case "booking": {
        const { data } = await serviceClient
          .from("bookings")
          .select("id, external_code")
          .eq("id", entityId)
          .maybeSingle()
        const label = data?.external_code ?? entityId
        return {
          type: "Booking",
          label,
          link: `/bookings/${entityId}?view=operations`,
        }
      }
      case "task": {
        const { data } = await serviceClient
          .from("tasks")
          .select("id, title")
          .eq("id", entityId)
          .maybeSingle()
        return {
          type: "Task",
          label: data?.title ?? "Task",
          link: `/tasks/${entityId}`,
        }
      }
      case "lead": {
        const { data } = await serviceClient
          .from("sales_leads")
          .select("id, lead_code")
          .eq("id", entityId)
          .maybeSingle()
        return {
          type: "Lead",
          label: data?.lead_code ?? "Lead",
          link: undefined,
        }
      }
      default:
        return {
          type: titleCase(scope) || "Record",
          label: entityId,
        }
    }
  } catch {
    return {
      type: titleCase(scope) || "Record",
      label: entityId,
    }
  }
}
