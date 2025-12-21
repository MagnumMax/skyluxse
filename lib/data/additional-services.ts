
import { serviceClient } from "@/lib/supabase/service-client"
import { AdditionalService, BookingAdditionalService, TaskAdditionalService } from "@/lib/domain/additional-services"

// Services CRUD
export async function getAdditionalServices() {
  const { data, error } = await serviceClient
    .from("additional_services")
    .select("*")
    .order("name")
  
  if (error) throw error
  return data as AdditionalService[]
}

// Booking Links
export async function getBookingServices(bookingId: string) {
    const { data, error } = await serviceClient
        .from("booking_additional_services")
        .select("*, service:additional_services(*)")
        .eq("booking_id", bookingId)
        
    if (error) throw error
    return data as BookingAdditionalService[]
}

// Task Links
export async function getTaskServices(taskId: string) {
    const { data, error } = await serviceClient
        .from("task_additional_services")
        .select("*, service:additional_services(*)")
        .eq("task_id", taskId)
        
    if (error) throw error
    return data as TaskAdditionalService[]
}
