
"use server"

import { revalidatePath } from "next/cache"
import { serviceClient } from "@/lib/supabase/service-client"
import { AdditionalService, BookingAdditionalService, TaskAdditionalService } from "@/lib/domain/additional-services"
import { updateSalesOrderForBooking } from "@/app/actions/zoho"

// Services CRUD
export async function createAdditionalService(service: Partial<AdditionalService>) {
    const { data, error } = await serviceClient
        .from("additional_services")
        .insert(service)
        .select()
        .single()

    if (error) throw error
    revalidatePath("/exec/services")
    return data as AdditionalService
}

export async function updateAdditionalService(id: string, updates: Partial<AdditionalService>) {
    const { data, error } = await serviceClient
        .from("additional_services")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

    if (error) throw error
    revalidatePath("/exec/services")
    return data as AdditionalService
}

export async function deleteAdditionalService(id: string) {
    const { error } = await serviceClient
        .from("additional_services")
        .delete()
        .eq("id", id)

    if (error) throw error
    revalidatePath("/exec/services")
}

// Booking Links
export async function addServiceToBooking(bookingId: string, serviceId: string, overrides: { price?: number, description?: string, quantity?: number } = {}) {
    // Fetch default if not provided
    let price = overrides.price
    let description = overrides.description

    if (price === undefined || description === undefined) {
        const { data: service } = await serviceClient.from("additional_services").select("*").eq("id", serviceId).single()
        if (service) {
            if (price === undefined) price = service.default_price
            if (description === undefined) description = service.description
        }
    }

    const { data, error } = await serviceClient
        .from("booking_additional_services")
        .insert({
            booking_id: bookingId,
            service_id: serviceId,
            price: price ?? 0,
            description: description ?? "",
            quantity: overrides.quantity ?? 1
        })
        .select()
        .single()

    if (error) throw error
    revalidatePath(`/bookings/${bookingId}`)

    // Sync with Zoho
    await updateSalesOrderForBooking(bookingId).catch(err => {
        console.error(`Failed to sync Zoho for booking ${bookingId}:`, err)
    })

    return data
}

export async function updateBookingService(linkId: string, bookingId: string, updates: { price?: number, description?: string, quantity?: number }) {
    const { data, error } = await serviceClient
        .from("booking_additional_services")
        .update(updates)
        .eq("id", linkId)
        .select()
        .single()

    if (error) throw error
    revalidatePath(`/bookings/${bookingId}`)

    // Sync with Zoho
    await updateSalesOrderForBooking(bookingId).catch(err => {
        console.error(`Failed to sync Zoho for booking ${bookingId}:`, err)
    })

    return data
}

export async function removeServiceFromBooking(linkId: string, bookingId: string) {
    const { error } = await serviceClient
        .from("booking_additional_services")
        .delete()
        .eq("id", linkId)

    if (error) throw error
    revalidatePath(`/bookings/${bookingId}`)

    // Sync with Zoho
    await updateSalesOrderForBooking(bookingId).catch(err => {
        console.error(`Failed to sync Zoho for booking ${bookingId}:`, err)
    })
}

// Task Links
export async function addServiceToTask(taskId: string, serviceId: string, overrides: { price?: number, description?: string, quantity?: number } = {}) {
    // Fetch default if not provided
    let price = overrides.price
    let description = overrides.description

    if (price === undefined || description === undefined) {
        const { data: service } = await serviceClient.from("additional_services").select("*").eq("id", serviceId).single()
        if (service) {
            if (price === undefined) price = service.default_price
            if (description === undefined) description = service.description
        }
    }

    const { data, error } = await serviceClient
        .from("task_additional_services")
        .insert({
            task_id: taskId,
            service_id: serviceId,
            price: price ?? 0,
            description: description ?? "",
            quantity: overrides.quantity ?? 1
        })
        .select()
        .single()

    if (error) throw error
    revalidatePath(`/tasks/${taskId}`)
    revalidatePath(`/driver/tasks/${taskId}`)

    // Sync with Zoho if task is linked to booking
    const { data: task } = await serviceClient
        .from("tasks")
        .select("booking_id")
        .eq("id", taskId)
        .single()

    if (task?.booking_id) {
        await updateSalesOrderForBooking(task.booking_id).catch(err => {
            console.error(`Failed to sync Zoho for task ${taskId} (booking ${task.booking_id}):`, err)
        })
    }

    return data
}

export async function updateTaskService(linkId: string, taskId: string, updates: { price?: number, description?: string, quantity?: number }) {
    const { data, error } = await serviceClient
        .from("task_additional_services")
        .update(updates)
        .eq("id", linkId)
        .select()
        .single()

    if (error) throw error
    revalidatePath(`/tasks/${taskId}`)
    revalidatePath(`/driver/tasks/${taskId}`)

    // Sync with Zoho if task is linked to booking
    const { data: task } = await serviceClient
        .from("tasks")
        .select("booking_id")
        .eq("id", taskId)
        .single()

    if (task?.booking_id) {
        await updateSalesOrderForBooking(task.booking_id).catch(err => {
            console.error(`Failed to sync Zoho for task ${taskId} (booking ${task.booking_id}):`, err)
        })
    }

    return data
}

export async function removeServiceFromTask(linkId: string, taskId: string) {
    const { error } = await serviceClient
        .from("task_additional_services")
        .delete()
        .eq("id", linkId)

    if (error) throw error
    revalidatePath(`/tasks/${taskId}`)
    revalidatePath(`/driver/tasks/${taskId}`)

    // Sync with Zoho if task is linked to booking
    const { data: task } = await serviceClient
        .from("tasks")
        .select("booking_id")
        .eq("id", taskId)
        .single()

    if (task?.booking_id) {
        await updateSalesOrderForBooking(task.booking_id).catch(err => {
            console.error(`Failed to sync Zoho for task ${taskId} (booking ${task.booking_id}):`, err)
        })
    }
}

// Queries
export async function getAdditionalServices() {
    const { data, error } = await serviceClient
        .from("additional_services")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true })

    if (error) throw error
    return data as AdditionalService[]
}

export async function getTaskServices(taskId: string) {
    const { data, error } = await serviceClient
        .from("task_additional_services")
        .select("*, service:additional_services(*)")
        .eq("task_id", taskId)

    if (error) throw error
    return data as TaskAdditionalService[]
}
