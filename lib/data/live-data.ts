import { cache } from "react"

import type {
  Booking,
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
import { serviceClient } from "@/lib/supabase/service-client"

type ClientRow = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  residency_country: string | null
  tier: string | null
  segment: string | null
  outstanding_amount: number | null
  lifetime_value: number | null
  nps_score: number | null
  preferred_channels: string[] | null
  preferred_language: string | null
  timezone: string | null
  created_at: string | null
}

type VehicleRow = {
  id: string
  external_ref: string | null
  name: string | null
  plate_number: string | null
  status: string | null
  class: string | null
  body_style: string | null
  segment: string | null
  mileage_km: number | null
  utilization_pct: number | null
  revenue_ytd: number | null
  model_year: number | null
  exterior_color: string | null
  updated_at: string | null
  created_at: string | null
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
  kommo_status_id: number | null
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
  mime_type: string | null
  created_at: string | null
}

type DocumentLinkRow = {
  id: string
  document_id: string
  scope: string
  entity_id: string
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

type MaintenanceJobRow = {
  id: string
  vehicle_id: string | null
  job_type: string | null
  status: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  vendor: string | null
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

const fetchClientRows = cache(async (): Promise<ClientRow[]> => {
  const { data, error } = await serviceClient
    .from("clients")
    .select(
      "id, name, phone, email, residency_country, tier, segment, outstanding_amount, lifetime_value, nps_score, preferred_channels, preferred_language, timezone, created_at"
    )
    .order("name", { ascending: true })
    .limit(500)
  if (error) {
    throw new Error(`[supabase] Failed to load clients: ${error.message}`)
  }
  return data ?? []
})

const fetchVehicleRows = cache(async (): Promise<VehicleRow[]> => {
  const { data, error } = await serviceClient
    .from("vehicles")
    .select(
      "id, external_ref, name, plate_number, status, class, body_style, segment, mileage_km, utilization_pct, revenue_ytd, model_year, exterior_color, updated_at, created_at"
    )
    .order("name", { ascending: true })
    .limit(500)
  if (error) {
    throw new Error(`[supabase] Failed to load vehicles: ${error.message}`)
  }
  return data ?? []
})

const fetchBookingRows = cache(async (): Promise<BookingRow[]> => {
  const { data, error } = await serviceClient
    .from("bookings")
    .select(
      "id, external_code, client_id, vehicle_id, driver_id, owner_id, status, booking_type, channel, priority, start_at, end_at, total_amount, deposit_amount, created_at, updated_at, kommo_status_id"
    )
    .order("start_at", { ascending: false })
    .limit(500)
  if (error) {
    throw new Error(`[supabase] Failed to load bookings: ${error.message}`)
  }
  return data ?? []
})

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

export const getStaffAccounts = cache(async (): Promise<StaffRow[]> => {
  return fetchStaffRows()
})

const fetchDocumentLinkRows = cache(async (): Promise<DocumentLinkRow[]> => {
  const { data, error } = await serviceClient
    .from("document_links")
    .select("id, document_id, scope, entity_id, metadata, document:documents(id, bucket, storage_path, file_name, mime_type, created_at)")
    .limit(2000)
  if (error) {
    throw new Error(`[supabase] Failed to load document links: ${error.message}`)
  }
  const rows = (data ?? []) as RawDocumentLinkRow[]
  return rows.map(normalizeDocumentLinkRow)
})

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
  const { data, error } = await serviceClient
    .from("maintenance_jobs")
    .select("id, vehicle_id, job_type, status, scheduled_start, scheduled_end, vendor")
    .order("scheduled_start", { ascending: false })
    .limit(1000)
  if (error) {
    if (isMissingTableError(error, "maintenance_jobs")) {
      return []
    }
    throw new Error(`[supabase] Failed to load maintenance jobs: ${error.message}`)
  }
  return data ?? []
})

export const getLiveClients = cache(async (): Promise<Client[]> => {
  const [clientRows, bookingRows, vehicleRows, invoiceRows, documentLinks, notificationRows] = await Promise.all([
    fetchClientRows(),
    fetchBookingRows(),
    fetchVehicleRows(),
    fetchBookingInvoiceRows(),
    fetchDocumentLinkRows(),
    fetchClientNotificationRows(),
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
  documentLinks.forEach((row) => {
    if ((row.scope ?? "").toLowerCase() !== "client") return
    const doc = mapDocumentLinkRow(row)
    if (!doc) return
    const list = documentsByClient.get(row.entity_id) ?? []
    list.push(doc)
    documentsByClient.set(row.entity_id, list)
  })

  const notificationsByClient = new Map<string, ClientNotification[]>()
  notificationRows.forEach((row) => {
    const note = mapNotificationRow(row)
    const list = notificationsByClient.get(row.client_id) ?? []
    list.push(note)
    notificationsByClient.set(row.client_id, list)
  })

  return clientRows.map((row) => {
    const rentals = buildClientRentals(bookingsByClient.get(row.id) ?? [], vehiclesById)
    const turnover = rentals.reduce((sum, rental) => sum + (rental.totalAmount ?? 0), 0)
    return {
      id: row.id,
      name: row.name ?? "Unnamed client",
      phone: row.phone ?? "—",
      email: row.email ?? "—",
      status: formatTier(row.tier),
      segment: formatSegment(row.segment),
      residencyCountry: row.residency_country ?? undefined,
      outstanding: numberOrZero(row.outstanding_amount),
      turnover: turnover || numberOrZero(row.lifetime_value),
      lifetimeValue: numberOrZero(row.lifetime_value) || turnover,
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
    }
  })
})

export const getLiveClientById = cache(async (clientId: string): Promise<Client | null> => {
  const clients = await getLiveClients()
  return clients.find((client) => String(client.id) === clientId) ?? null
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
  const doc = mapDocumentLinkRow(normalized)
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
  const rows = await fetchVehicleRows()
  return rows.map(mapVehicleRow)
})

export const getLiveFleetVehicleById = cache(async (vehicleId: string): Promise<FleetCar | null> => {
  const vehicles = await getLiveFleetVehicles()
  return vehicles.find((vehicle) => String(vehicle.id) === vehicleId) ?? null
})

export const getLiveBookings = cache(async (): Promise<Booking[]> => {
  const [bookingRows, clientRows, vehicleRows, invoiceRows, staffRows] = await Promise.all([
    fetchBookingRows(),
    fetchClientRows(),
    fetchVehicleRows(),
    fetchBookingInvoiceRows(),
    fetchStaffRows(),
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

  return bookingRows.map((row) => mapBookingRow(row, { clientsById, vehiclesById, staffById, invoicesByBooking }))
})

export const getLiveBookingById = cache(async (bookingId: string): Promise<Booking | null> => {
  const bookings = await getLiveBookings()
  return bookings.find((booking) => String(booking.id) === bookingId) ?? null
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

export const getFleetCalendarData = cache(async (): Promise<{ vehicles: FleetCar[]; events: CalendarEvent[] }> => {
  const [vehicles, bookings, calendarRows, maintenanceRows] = await Promise.all([
    getLiveFleetVehicles(),
    getLiveBookings(),
    fetchCalendarEventRows(),
    fetchMaintenanceJobRows(),
  ])
  const events = buildFleetCalendarEvents({ vehicles, bookings, calendarRows, maintenanceRows })
  return { vehicles, events }
})

function mapVehicleRow(row: VehicleRow): FleetCar {
  const utilization = normalizeRatio(row.utilization_pct)
  const updatedAt = row.updated_at ?? row.created_at ?? new Date().toISOString()
  const nextServiceDate = new Date(updatedAt)
  nextServiceDate.setDate(nextServiceDate.getDate() + 45)
  return {
    id: row.id,
    name: row.name ?? "Unnamed vehicle",
    plate: row.plate_number ?? "—",
    status: mapVehicleStatus(row.status),
    class: row.class ?? "Class",
    bodyStyle: row.body_style ?? "Body type",
    segment: row.segment ?? "Segment",
    color: row.exterior_color ?? "Black",
    year: row.model_year ?? new Date(updatedAt).getFullYear(),
    mileage: row.mileage_km ?? 0,
    utilization,
    revenueYTD: numberOrZero(row.revenue_ytd),
    insuranceExpiry: undefined,
    mulkiyaExpiry: undefined,
    location: "SkyLuxse HQ",
    serviceStatus: {
      label: "Fleet health",
      health: utilization || 0.75,
      lastService: updatedAt,
      nextService: nextServiceDate.toISOString(),
      mileageToService: Math.max(0, 10000 - ((row.mileage_km ?? 0) % 10000)),
    },
    documents: [],
    reminders: [],
  }
}

function mapBookingRow(
  row: BookingRow,
  context: {
    clientsById: Map<string, ClientRow>
    vehiclesById: Map<string, VehicleRow>
    staffById: Map<string, StaffRow>
    invoicesByBooking: Map<string, BookingInvoice[]>
  }
): Booking {
  const start = row.start_at ?? new Date().toISOString()
  const end = row.end_at ?? start
  const client = row.client_id ? context.clientsById.get(row.client_id) : null
  const vehicle = row.vehicle_id ? context.vehiclesById.get(row.vehicle_id) : null
  const owner = row.owner_id ? context.staffById.get(row.owner_id) : null
  const invoices = context.invoicesByBooking.get(row.id) ?? []
  return {
    id: row.id,
    code: row.external_code ?? formatFallbackCode(row.id),
    clientId: row.client_id ?? row.id,
    clientName: client?.name ?? "Unassigned",
    carId: row.vehicle_id ?? row.id,
    carName: vehicle?.name ?? "Unassigned vehicle",
    startDate: start,
    endDate: end,
    startTime: start,
    endTime: end,
    driverId: row.driver_id ?? null,
    status: mapBookingStatus(row.status),
    totalAmount: numberOrZero(row.total_amount),
    paidAmount: numberOrZero(row.total_amount),
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
    timeline: [],
    salesService: undefined,
    billing: {
      base: numberOrZero(row.total_amount),
      addons: 0,
      fees: 0,
      discounts: 0,
      currency: AED,
    },
    pickupMileage: undefined,
    pickupFuel: undefined,
    returnMileage: undefined,
    returnFuel: undefined,
    documents: [],
    invoices,
    history: [],
    extensions: [],
    kommoStatusId: row.kommo_status_id ?? undefined,
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

function buildClientRentals(bookings: BookingRow[], vehiclesById: Map<string, VehicleRow>): ClientRental[] {
  return bookings
    .sort((a, b) => (b.start_at ?? "").localeCompare(a.start_at ?? ""))
    .slice(0, 4)
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
  switch ((value ?? "available").toLowerCase()) {
    case "maintenance":
      return "Maintenance"
    case "in_rent":
      return "In Rent"
    default:
      return "Available"
  }
}

function formatTier(value: string | null): string {
  const tier = (value ?? "vip").toLowerCase()
  if (tier === "vip") return "VIP"
  if (tier === "gold") return "Gold"
  if (tier === "silver") return "Silver"
  return titleCase(value) || "VIP"
}

function formatSegment(value: string | null): string {
  return titleCase(value) || "General"
}

function buildPreferredChannels(values: string[] | null): string[] {
  const entries = Array.isArray(values) && values.length ? values : ["email"]
  return entries.map((entry) => titleCase(entry) || entry)
}

function numberOrZero(value: number | string | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
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

function mapDocumentLinkRow(row: DocumentLinkRow): ClientDocument | null {
  if (!row.document) return null
  const metadata = (row.metadata ?? {}) as Record<string, any>
  const bucket = row.document.bucket ?? "documents"
  const storagePath = row.document.storage_path ?? row.document.file_name ?? undefined
  return {
    id: row.document.id,
    type: metadata.type ?? metadata.doc_type ?? row.scope ?? "document",
    name: metadata.name ?? row.document.file_name ?? metadata.type ?? "Document",
    status: metadata.status ?? "active",
    expiry: metadata.expiry ?? metadata.expires_at ?? undefined,
    url: buildStoragePublicUrl(bucket, storagePath),
    number: metadata.number ?? undefined,
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

function buildStoragePublicUrl(bucket?: string | null, path?: string | null): string | undefined {
  if (!SUPABASE_PUBLIC_URL || !bucket || !path) return undefined
  const normalizedPath = path.replace(/^\/+/, "")
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/${bucket}/${normalizedPath}`
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

  const calendarEvents = params.calendarRows.map((row) => mapCalendarEventRow(row, { vehiclesById, bookingsById }))

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
    type: mapCalendarEventType(row.event_type),
    title,
    start,
    end,
    priority: booking?.priority ?? "medium",
  }
}

function mapMaintenanceJobRow(row: MaintenanceJobRow, vehiclesById: Map<string, FleetCar>): CalendarEvent | null {
  if (!row.scheduled_start && !row.scheduled_end) return null
  const vehicle = row.vehicle_id ? vehiclesById.get(row.vehicle_id) : undefined
  const start = row.scheduled_start ?? row.scheduled_end ?? new Date().toISOString()
  const end = row.scheduled_end ?? start
  return {
    id: `maintenance-job-${row.id}`,
    carId: row.vehicle_id ?? row.id,
    type: mapMaintenanceJobType(row.job_type),
    title: vehicle ? `${vehicle.name} · ${titleCase(row.job_type) || "Maintenance"}` : `Maintenance ${row.id}`,
    start,
    end,
    priority: "medium",
  }
}

function mapCalendarEventType(value: string | null | undefined): CalendarEvent["type"] {
  const normalized = (value ?? "rental").toLowerCase()
  if (normalized === "booking" || normalized === "rental") return "rental"
  if (normalized === "maintenance") return "maintenance"
  return "repair"
}

function mapMaintenanceJobType(value: string | null | undefined): CalendarEvent["type"] {
  const normalized = (value ?? "maintenance").toLowerCase()
  if (normalized === "repair") return "repair"
  return "maintenance"
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
          link: `/sales/clients/${entityId}`,
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
          link: `/operations/fleet/${entityId}`,
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
          link: `/operations/bookings/${entityId}`,
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
          link: `/operations/tasks/${entityId}`,
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
