export type BookingStatus = "new" | "preparation" | "delivery" | "in-rent" | "settlement"

export type BookingPriority = "high" | "medium" | "low"

export type BookingType = "vip" | "short" | "corporate" | "rental" | "chauffeur" | "transfer"

export type EntityId = string | number

export interface Booking {
  id: EntityId
  code: string
  clientId: EntityId
  clientName: string
  carId: EntityId
  carName: string
  carPlate?: string | null
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  driverId: EntityId | null
  status: BookingStatus
  kommoStatusId?: number | null
  pipelineStageId?: string
  pipelineStageName?: string
  totalAmount: number
  paidAmount: number
  deposit: number
  priority: BookingPriority
  type: BookingType
  channel: string
  ownerId: string
  ownerName?: string
  segment: string
  pickupLocation?: string
  dropoffLocation?: string
  targetTime?: number | null
  serviceLevel?: {
    slaMinutes: number
    promisedAt: string
    actualAt: string | null
  }
  addons?: string[]
  tags?: string[]
  timeline?: Array<{ ts: string; status: string; note: string; actor: string }>
  deliveryFeeLabel?: string | null
  deliveryLocation?: string | null
  collectLocation?: string | null
  rentalDurationDays?: number | null
  priceDaily?: number | null
  insuranceFeeLabel?: string | null
  fullInsuranceFee?: number | null
  advancePayment?: number | null
  salesOrderUrl?: string | null
  agreementNumber?: string | null
  mileageLimit?: string | null
  zohoSalesOrderId?: string | null
  salesService?: {
    rating?: number
    feedback?: string
    ratedBy?: string
    ratedAt?: string
  }
  billing?: {
    base: number
    addons: number
    fees?: number
    discounts: number
    currency: string
    vatRate?: number
  }
  pickupMileage?: number
  pickupFuel?: string
  returnMileage?: number | null
  returnFuel?: string | null
  documents?: BookingDocument[]
  invoices?: BookingInvoice[]
  history?: BookingHistoryItem[]
  extensions?: BookingExtension[]
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}

export interface BookingInvoice {
  id: string
  label: string
  amount: number
  status: string
  issuedDate?: string
  dueDate?: string
  scope?: string
}

export interface BookingDocument {
  type: string
  status: string
  url?: string
  name?: string
}

export interface BookingHistoryItem {
  ts: string
  event: string
}

export interface BookingExtension {
  id: string
  label: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  status: string
  createdAt?: string
  createdBy?: string
  note?: string
  pricing?: {
    base: number
    addons: number
    fees?: number
    discounts: number
    currency: string
    total?: number
  }
  payments?: {
    paidAmount?: number
    outstandingAmount?: number
    lastPaymentAt?: string
    depositAdjustment?: number
  }
  invoiceId?: string
  tasks?: Array<{ id: string; title: string; type: string; status: string; deadline?: string }>
  timeline?: Array<{ ts: string; status: string; note: string; actor: string }>
  notifications?: Array<{ channel: string; ts: string; status: string; template: string }>
}

export interface Driver {
  id: EntityId
  name: string
  status: "Available" | "On Task" | "Standby"
}

export interface ClientDocument {
  id: string
  type: string
  name: string
  url?: string
  status: string
  number?: string
  expiry?: string
}

export interface ClientRental {
  bookingId: EntityId
  bookingCode?: string
  status: string
  startDate: string
  endDate: string
  carName: string
  totalAmount: number
}

export interface ClientPayment {
  id: string
  type: string
  amount: number
  status: string
  channel: string
  date: string
}

export interface ClientNotification {
  id: string
  channel: string
  subject: string
  date: string
  status: string
}

export interface ClientPreferences {
  notifications: string[]
  language: string
  timezone: string
}

export interface ClientDocumentRecognition {
  status?: string
  confidence?: number
  model?: string
  documentId?: string
  docType?: string
  processedAt?: string
  error?: string
  raw?: Record<string, any>
}

export interface Client {
  id: EntityId
  name: string
  firstName?: string
  lastName?: string
  middleName?: string
  dateOfBirth?: string
  nationality?: string
  address?: string
  documentNumber?: string
  issueDate?: string
  expiryDate?: string
  issuingCountry?: string
  driverClass?: string
  driverRestrictions?: string
  driverEndorsements?: string
  phone: string
  email: string
  status: string
  segment: string
  residencyCountry?: string
  gender?: string
  kommoContactId?: string
  kommoContactUrl?: string
  outstanding: number
  lifetimeValue: number
  nps: number
  documents: ClientDocument[]
  rentals: ClientRental[]
  payments: ClientPayment[]
  notifications: ClientNotification[]
  preferences: ClientPreferences
  documentRecognition?: ClientDocumentRecognition
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  lastBookingDate?: string
}

export interface OutboxJob {
  id: string
  bookingId: EntityId
  clientName: string
  targetSystem: "Zoho"
  eventType: "contact.upsert" | "salesOrder.create"
  status: "pending" | "processing" | "failed" | "completed"
  attempts: number
  nextRetry?: string
  lastError?: string
  createdAt: string
}

export type TaskInputType = "number" | "text" | "select" | "file"

export interface TaskRequiredInput {
  key: string
  label: string
  type: TaskInputType
  required: boolean
  multiple?: boolean
  accept?: string
  options?: string[]
}

export interface TaskInputValue {
  key: string
  valueText?: string | null
  valueNumber?: number | null
  valueJson?: Record<string, any> | null
  storagePaths?: string[] | null
  bucket?: string | null
}

export interface Task {
  id: EntityId
  title: string
  type: "delivery" | "pickup" | "maintenance"
  category: string
  status: "todo" | "inprogress" | "done"
  deadline: string
  bookingId?: EntityId
  bookingCode?: string
  clientId?: EntityId
  clientName?: string
  vehicleName?: string
  vehiclePlate?: string
  vehicleId?: EntityId
  lastVehicleOdometer?: number
  lastVehicleFuel?: number
  priority: "High" | "Medium" | "Low"
  description: string
  geo?: { pickup?: string; dropoff?: string }
  slaMinutes: number
  requiredInputs?: TaskRequiredInput[]
  inputValues?: TaskInputValue[]
  outstandingAmount?: number
  currency?: string
  clientPhone?: string
}

export interface OperationsTask extends Task {
  owner: string
  ownerRole: string
  requiredInputProgress: {
    completed: number
    total: number
  }
  lastUpdate: string
  channel: string
}

export type FleetCarStatus = "Available" | "In Rent" | "Maintenance" | "Reserved" | "Sold" | "Service Car"

export interface VehicleDocument {
  id: string
  type: string
  name: string
  expiry?: string
  status: "active" | "warning" | "expired" | string
  url?: string
  notes?: string
  bucket?: string
  storagePath?: string
}

export interface VehicleReminder {
  id: string
  type: string
  dueDate: string
  status: "scheduled" | "warning" | "critical" | string
  severity?: string
  notes?: string
}

export interface VehicleServiceStatus {
  label: string
  lastService: string
  nextService: string
  mileageToService: number
}

export interface VehicleInspection {
  date: string
  driver?: string
  performedBy?: string
  notes?: string
  photos?: string[]
}

export interface VehicleMaintenanceEntry {
  id: string
  date: string
  type: string
  plannedStart?: string
  plannedEnd?: string
  actualStart?: string
  actualEnd?: string
  location?: string
  odometer?: number
  notes?: string
  vendor?: string
  status?: string
  costEstimate?: number
  documents?: VehicleDocument[]
}

export interface FleetCar {
  id: EntityId
  name: string
  make?: string
  model?: string
  vin?: string
  plate: string
  status: FleetCarStatus
  class: string
  bodyStyle?: string
  color: string
  interiorColor?: string
  year: number
  seatingCapacity?: number
  mileage: number
  utilization: number
  revenueYTD: number
  engineDisplacementL?: number
  powerHp?: number
  cylinders?: number
  zeroToHundredSec?: number
  transmission?: string
  insuranceExpiry?: string
  mulkiyaExpiry?: string
  serviceStatus: VehicleServiceStatus
  documents: VehicleDocument[]
  reminders: VehicleReminder[]
  documentGallery?: string[]
  inspections?: VehicleInspection[]
  maintenanceHistory?: VehicleMaintenanceEntry[]
  imageUrl?: string
  location?: string
  kommoVehicleId?: string
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

export type CalendarEventType = "reservation" | "rental" | "maintenance" | "repair"

export interface CalendarEvent {
  id: string
  carId: EntityId
  bookingId?: EntityId | null
  type: CalendarEventType
  title: string
  start: string
  end: string
  priority: BookingPriority
  bookingStatus?: BookingStatus | null
  stageLabel?: string
  kommoStatusId?: number | null
}

export interface ExecReportDataPoint {
  date: string
  revenue: number
  expenses: number
}

export interface ExecReportVehicle {
  name: string
  revenue: number
  utilization: number
}

export interface ExecReportChannel {
  channel: string
  revenue: number
  share: number
}

export interface ExecReportsSnapshot {
  periodLabel: string
  financials: {
    revenue: number
    expenses: number
    profit: number
  }
  revenueDaily: ExecReportDataPoint[]
  topVehicles: ExecReportVehicle[]
  channelMix: ExecReportChannel[]
}

export interface ExecDashboardDataPoint {
  date: string
  revenue: number
  expenses: number
  bookings: number
}

export interface ExecDashboardDriverPerformance {
  driverId: EntityId
  completionRate: number
  nps: number
}

export interface ExecDashboardData {
  kpis: {
    fleetUtilization: number
    slaCompliance: number
    activeBookings: number
    clientNps: number
  }
  revenueTrend: ExecDashboardDataPoint[]
  driverPerformance: ExecDashboardDriverPerformance[]
}
