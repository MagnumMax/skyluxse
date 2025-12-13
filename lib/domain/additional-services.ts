
export interface AdditionalService {
  id: string
  name: string
  description: string | null
  default_price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BookingAdditionalService {
  id: string
  booking_id: string
  service_id: string
  price: number
  description: string | null
  quantity: number
  created_at: string
  service?: AdditionalService
}

export interface TaskAdditionalService {
  id: string
  task_id: string
  service_id: string
  price: number
  description: string | null
  quantity: number
  created_at: string
  service?: AdditionalService
}
