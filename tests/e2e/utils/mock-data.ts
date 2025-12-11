const nowISO = () => new Date().toISOString()

type TaskRow = {
  id: string
  title: string | null
  task_type: string | null
  status: string | null
  deadline_at: string | null
  booking_id: string | null
  vehicle_id: string | null
  client_id: string | null
  assignee_driver_id: string | null
  created_by: string | null
  sla_minutes: number | null
  metadata: Record<string, unknown> | null
  task_required_input_values?: Array<{
    key: string | null
    value_number: number | null
    value_text: string | null
    value_json: Record<string, any> | null
    storage_paths: string[] | null
    bucket: string | null
  }> | null
  created_at: string | null
  updated_at: string | null
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
}

type ClientRow = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  tier: string | null
  segment: string | null
  outstanding_amount: number | null
  nps_score: number | null
  created_at: string | null
  updated_at: string | null
}

export function createDriverTaskRow(overrides: Partial<TaskRow> = {}): TaskRow {
  const { metadata: overridesMetadata, ...restOverrides } = overrides
  const metadata = {
    description: "Inspect vehicle, capture photos, collect client signature.",
    priority: "high",
    ...(overridesMetadata as Record<string, unknown> | undefined),
  }
  return {
    id: "task-mock-" + Math.random().toString(36).slice(2, 7),
    title: "Deliver reference vehicle",
    task_type: "delivery",
    status: "todo",
    deadline_at: nowISO(),
    booking_id: "booking-mock",
    vehicle_id: "vehicle-mock",
    client_id: "client-mock",
    assignee_driver_id: "driver-1",
    created_by: "staff-1",
    sla_minutes: 60,
    created_at: nowISO(),
    updated_at: nowISO(),
    ...restOverrides,
    metadata,
  }
}

export function createBookingRow(overrides: Partial<BookingRow> = {}): BookingRow {
  return {
    id: "booking-mock-" + Math.random().toString(36).slice(2, 7),
    external_code: "BK-MOCK",
    client_id: "client-mock",
    vehicle_id: "vehicle-mock",
    driver_id: "driver-1",
    owner_id: "staff-1",
    status: "delivery",
    booking_type: "rental",
    channel: "manual",
    priority: "medium",
    start_at: nowISO(),
    end_at: nowISO(),
    total_amount: 2500,
    deposit_amount: 500,
    created_at: nowISO(),
    updated_at: nowISO(),
    created_by: "staff-1",
    kommo_status_id: 1,
    ...overrides,
  }
}

export function createClientRow(overrides: Partial<ClientRow> = {}): ClientRow {
  return {
    id: "client-mock-" + Math.random().toString(36).slice(2, 7),
    name: "Mock Client",
    phone: "+97150000000",
    email: "client@example.com",
    tier: "gold",
    segment: "vip",
    outstanding_amount: 0,
    nps_score: 9,
    created_at: nowISO(),
    updated_at: nowISO(),
    ...overrides,
  }
}
