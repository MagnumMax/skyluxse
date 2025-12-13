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
    .select("metadata, status, task_required_input_values(key, value_number, storage_paths, bucket)")
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
  return { requiredInputs, metadata, status: (data?.status as ActionResult["status"]) ?? "todo", previousOdometer }
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
          // Try to create/sync sales order
          try {
            const { createSalesOrderForBooking } = await import("@/app/actions/zoho")
            // We don't await this to not block the UI response, or maybe we should?
            // The user wants "these records must be added to sale Order".
            // Let's await it to ensure it happens, or log error.
            await createSalesOrderForBooking(String(task.booking_id))
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
  const submission = SubmitInputsSchema.safeParse({
    taskId: formData.get("taskId"),
    odometer: formData.get("odometer"),
    fuel: formData.get("fuel"),
    notes: formData.get("notes"),
    agreementNumber: formData.get("agreementNumber"),
    cleaning: formData.get("cleaning"),
  })

  if (!submission.success) {
    const message = submission.error.issues.map((issue) => issue.message).join(", ") || "Invalid input submission"
    return { success: false, message }
  }

  const { taskId, odometer, fuel, notes, agreementNumber, paymentCollected } = submission.data
  const photoFiles = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0)
  const damagePhotos = formData.getAll("damage_photos").filter((item): item is File => item instanceof File && item.size > 0)

  try {
    const { requiredInputs, previousOdometer } = await getTaskMetadata(taskId)
    const filteredInputs = filterSignatureInputs(requiredInputs)
    if (odometer !== undefined && previousOdometer !== undefined && odometer < previousOdometer) {
      return { success: false, message: `Пробег не может быть меньше ${previousOdometer}` }
    }
    const savedPaths: { path: string; bucket?: string; key?: string }[] = []

    const rows: Array<{
      task_id: string
      key: string
      value_number?: number | null
      value_text?: string | null
      value_json?: Record<string, any> | null
      storage_paths?: string[] | null
      bucket?: string | null
    }> = []

    if (odometer !== undefined) {
      rows.push({ task_id: taskId, key: odometerKey(filteredInputs), value_number: odometer })
    }
    if (fuel !== undefined) {
      rows.push({ task_id: taskId, key: fuelKey(filteredInputs), value_number: fuel })
    }
    if (notes !== undefined) {
      rows.push({ task_id: taskId, key: "damage_notes", value_text: notes })
    }
    if (agreementNumber !== undefined) {
      rows.push({ task_id: taskId, key: "agreement_number", value_text: agreementNumber })
    }
    if (paymentCollected !== undefined) {
      rows.push({ task_id: taskId, key: "payment_collected", value_number: paymentCollected })
    }

    const bucket = "task-media"

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
      rows.push({ task_id: taskId, key, storage_paths: paths, bucket })
    }

    await uploadFiles(photoFiles, photoKey(filteredInputs))
    await uploadFiles(damagePhotos, "damage_photos")

    if (rows.length) {
      const { error } = await serviceClient
        .from("task_required_input_values")
        .upsert(rows, { onConflict: "task_id,key" })
      if (error) {
        return { success: false, message: error.message }
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
