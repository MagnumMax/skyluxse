"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { serviceClient } from "@/lib/supabase/service-client"

type ActionResult = {
  success: boolean
  message?: string
  status?: "todo" | "inprogress" | "done"
  paths?: { path: string; bucket?: string; key?: string }[]
}

const CompleteTaskSchema = z.object({
  taskId: z.string().uuid(),
})

const SubmitInputsSchema = z.object({
  taskId: z.string().uuid(),
  odometer: z.preprocess(
    (value) => (value === null || value === undefined || value === "" ? undefined : value),
    z.coerce.number().int().nonnegative().optional()
  ),
  fuel: z.preprocess(
    (value) => (value === null || value === undefined || value === "" ? undefined : value),
    z.coerce.number().int().min(0).max(8).optional()
  ),
  notes: z.preprocess(
    (value) => (value === null || value === undefined || value === "" ? undefined : value),
    z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((v) => (v && v.length ? v : undefined))
  ),
  agreementNumber: z.preprocess(
    (value) => (value === null || value === undefined || value === "" ? undefined : value),
    z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((v) => (v && v.length ? v : undefined))
  ),
  paymentCollected: z.preprocess(
    (value) => (value === null || value === undefined || value === "" ? undefined : value),
    z.coerce.number().nonnegative().optional()
  ),
  cleaning: z.preprocess(
    (value) => (value === null || value === undefined || value === "" ? undefined : value),
    z.string().optional()
  ),
})

const DeletePhotoSchema = z.object({
  taskId: z.string().uuid(),
  path: z.string().min(3),
  bucket: z.string().min(1).default("task-media"),
})

const SignUrlSchema = z.object({
  bucket: z.string().min(1).default("task-media"),
  path: z.string().min(3),
})

async function getTaskMetadata(taskId: string) {
  const { data, error } = await serviceClient
    .from("tasks")
    .select("metadata, status, task_type, task_required_input_values(key, value_number, storage_paths, bucket)")
    .eq("id", taskId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const metadata = (data?.metadata as Record<string, any> | null) ?? {}
  const requiredInputs = Array.isArray(metadata.requiredInputs) ? metadata.requiredInputs : []
  const inputValues = Array.isArray(data?.task_required_input_values) ? data.task_required_input_values : []
  const previousOdometer =
    inputValues.find((row) => {
      const key = String(row?.key ?? "")
      return key === "odometer" || key.startsWith("odo_")
    })?.value_number ?? undefined
  return { requiredInputs, metadata, status: (data?.status as ActionResult["status"]) ?? "todo", previousOdometer, taskType: data.task_type }
}

export async function completeTask(input: z.infer<typeof CompleteTaskSchema>): Promise<ActionResult> {
  const parsed = CompleteTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: "Invalid task completion request" }
  }

  const { taskId } = parsed.data

  try {
    const { error } = await serviceClient.from("tasks").update({ status: "done" }).eq("id", taskId)

    if (error) {
      return { success: false, message: error.message }
    }

    // Sync additional services to booking and sales order
    const { data: task } = await serviceClient
      .from("tasks")
      .select("booking_id")
      .eq("id", taskId)
      .single()

    if (task?.booking_id) {
      const { data: taskServices } = await serviceClient
        .from("task_additional_services")
        .select("*")
        .eq("task_id", taskId)

      if (taskServices && taskServices.length > 0) {
        // Copy to booking_additional_services
        const bookingServices = taskServices.map((ts) => ({
          booking_id: task.booking_id,
          service_id: ts.service_id,
          price: ts.price,
          description: ts.description,
          quantity: ts.quantity,
        }))

        // @ts-ignore
        const { error: copyError } = await serviceClient
          .from("booking_additional_services")
          .upsert(bookingServices, { onConflict: "booking_id, service_id" })

        if (!copyError) {
          // Try to sync sales order (update only)
          try {
            const { updateSalesOrderForBooking } = await import("@/app/actions/zoho")
            // We don't await this to not block the UI response, or maybe we should?
            // The user wants "these records must be added to sale Order".
            // Let's await it to ensure it happens, or log error.
            const res = await updateSalesOrderForBooking(String(task.booking_id))
            if (!res.success) {
               console.warn("Update Sales Order warning:", res.error)
            }
          } catch (e) {
            console.error("Failed to sync sales order from task completion:", e)
          }
        }
      }
    }

    revalidatePath("/driver/tasks")
    revalidatePath(`/driver/tasks/${taskId}`)

    return { success: true, status: "done" }
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to complete task" }
  }
}

export async function submitTaskInputs(formData: FormData): Promise<ActionResult> {
  const taskId = formData.get("taskId")?.toString()
  const actionType = formData.get("actionType")?.toString() ?? "save"
  
  if (!taskId) {
    return { success: false, message: "Task ID is required" }
  }

  try {
    const { requiredInputs, previousOdometer, taskType, status } = await getTaskMetadata(taskId)
    
    // Validate Agreement Number for Delivery
    // We need to find if there is an agreement number input in metadata
    const agreementInput = requiredInputs.find(i => i.key === "agreementNumber" || i.key === "agreement_number")
    if (taskType === "delivery" && agreementInput) {
       const val = formData.get(agreementInput.key)
       if (!val || val.toString().trim() === "") {
          return { success: false, message: "Agreement Number is required for Delivery tasks" }
       }
    }

    const filteredInputs = filterSignatureInputs(requiredInputs)
    const rows: Array<{
      task_id: string
      key: string
      value_number?: number | null
      value_text?: string | null
      value_json?: Record<string, any> | null
      storage_paths?: string[] | null
      bucket?: string | null
    }> = []

    const bucket = "task-media"
    const savedPaths: { path: string; bucket?: string; key?: string }[] = []

    // Helper to upload files
    async function uploadFiles(files: File[], key: string) {
      if (!files.length) return
      const paths: string[] = []
      for (const file of files) {
        const path = `${taskId}/${Date.now()}-${file.name}`
        const { error } = await serviceClient.storage.from(bucket).upload(path, file, { upsert: true })
        if (error) throw new Error(`Upload failed: ${error.message}`)
        paths.push(path)
        savedPaths.push({ path, bucket, key })
      }
      rows.push({ task_id: taskId!, key, storage_paths: paths, bucket })
    }

    // Process all required inputs dynamically
    for (const input of filteredInputs) {
      const key = input.key
      const rawValue = formData.get(key)
      const rawValues = formData.getAll(key)

      // Files
      if (input.type === "file") {
        const files = rawValues.filter((item): item is File => item instanceof File && item.size > 0)
        await uploadFiles(files, key)
        continue
      }

      // Skip if empty (unless it's a file which we handled, or required check needed?)
      // We rely on HTML5 'required' attribute for client-side, but could add server-side check here.
      if (rawValue === null || rawValue === "" || rawValue === undefined) continue

      // Number inputs (Odometer, Fuel, Payment)
      if (input.type === "number" || key.startsWith("odo") || key.startsWith("fuel") || key.includes("payment")) {
         const numVal = Number(rawValue)
         if (!isNaN(numVal)) {
            // Odometer Validation
            if (key.startsWith("odo") && previousOdometer !== undefined && numVal < previousOdometer) {
                return { success: false, message: `Пробег не может быть меньше ${previousOdometer}` }
            }
            rows.push({ task_id: taskId, key, value_number: numVal })
         }
         continue
      }

      // Text / Select
      rows.push({ task_id: taskId, key, value_text: String(rawValue) })
    }

    // Fallback/Legacy handling: if form sends "odometer" but metadata expects "odo_after"
    // This handles the transition or mismatches if we don't update form perfectly.
    // However, we plan to update the form to use dynamic keys.
    // So we don't strictly need this, but it might be safe to check for "odometer" in formData if "odo_..." wasn't found?
    // Let's stick to dynamic keys for cleanliness.

    if (rows.length) {
      const { error } = await serviceClient
        .from("task_required_input_values")
        .upsert(rows, { onConflict: "task_id,key" })
      if (error) {
        return { success: false, message: error.message }
      }
    }

    if (actionType === "complete") {
      return await completeTask({ taskId })
    }

    if (status === "todo") {
      const { error } = await serviceClient
        .from("tasks")
        .update({ status: "inprogress" })
        .eq("id", taskId)
      
      if (error) {
        console.error("Failed to update task status to inprogress", error)
      }
    }

    revalidatePath("/driver/tasks")
    revalidatePath(`/driver/tasks/${taskId}`)

    return { success: true, message: "Данные сохранены", paths: savedPaths }
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to submit data" }
  }
}

export async function deleteTaskPhoto(input: z.infer<typeof DeletePhotoSchema>): Promise<ActionResult> {
  const parsed = DeletePhotoSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: "Invalid photo delete request" }
  }
  const { taskId, path, bucket } = parsed.data
  if (!path.includes(taskId)) {
    return { success: false, message: "Invalid file path" }
  }

  try {
    const { data: rows, error } = await serviceClient
      .from("task_required_input_values")
      .select("key, storage_paths, bucket")
      .eq("task_id", taskId)

    if (error) {
      return { success: false, message: error.message }
    }
    const match = (rows ?? []).find((row) => Array.isArray(row.storage_paths) && row.storage_paths.includes(path))
    if (!match) {
      return { success: false, message: "File not found" }
    }
    const newPaths = (match.storage_paths ?? []).filter((p: string | null) => p && p !== path)

    const storageBucket = match.bucket || bucket
    const { error: deleteError } = await serviceClient.storage.from(storageBucket).remove([path])
    if (deleteError) {
      return { success: false, message: deleteError.message }
    }

    const { error: updateError } = await serviceClient
      .from("task_required_input_values")
      .update({ storage_paths: newPaths.length ? newPaths : null, bucket: storageBucket })
      .eq("task_id", taskId)
      .eq("key", match.key)

    if (updateError) {
      return { success: false, message: updateError.message }
    }

    revalidatePath("/driver/tasks")
    revalidatePath(`/driver/tasks/${taskId}`)

    return { success: true }
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to delete photo" }
  }
}

export async function signTaskPhotoUrl(input: z.infer<typeof SignUrlSchema>): Promise<{ success: boolean; url?: string; message?: string }> {
  const parsed = SignUrlSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: "Invalid sign url request" }
  const { bucket, path } = parsed.data
  try {
    const { data, error } = await serviceClient.storage.from(bucket).createSignedUrl(path, 3600)
    if (error || !data?.signedUrl) return { success: false, message: error?.message ?? "Failed to sign url" }
    return { success: true, url: data.signedUrl }
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to sign url" }
  }
}

function odometerKey(requiredInputs: any[]): string {
  const match = requiredInputs.find((i) => typeof i?.key === "string" && i.key.startsWith("odo_"))
  return match?.key ?? "odometer"
}

function fuelKey(requiredInputs: any[]): string {
  const match = requiredInputs.find((i) => typeof i?.key === "string" && i.key.startsWith("fuel_"))
  return match?.key ?? "fuel_level"
}

function photoKey(requiredInputs: any[]): string {
  const match = requiredInputs.find((i) => typeof i?.key === "string" && i.key.toString().includes("photo"))
  return match?.key ?? "photos"
}

function filterSignatureInputs(requiredInputs: any[]) {
  return requiredInputs.filter((input) => {
    const key = String(input?.key ?? "")
    const label = String(input?.label ?? "")
    const normalized = `${key} ${label}`.toLowerCase()
    return !normalized.includes("signature")
  })
}
