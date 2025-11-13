"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { serviceClient } from "@/lib/supabase/service-client"

export type RateSalesServiceState = {
  status: "idle" | "success" | "error"
  message?: string
}

const RateSalesServiceSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(10),
  feedback: z
    .string()
    .trim()
    .max(1000, "Feedback is too long")
    .optional()
    .transform((value) => (value && value.length ? value : undefined)),
  ratedBy: z
    .string()
    .trim()
    .max(120, "Name is too long")
    .optional()
    .transform((value) => (value && value.length ? value : undefined)),
})

export async function rateSalesService(
  _prevState: RateSalesServiceState,
  formData: FormData,
): Promise<RateSalesServiceState> {
  const submission = RateSalesServiceSchema.safeParse({
    bookingId: formData.get("bookingId"),
    rating: formData.get("rating"),
    feedback: formData.get("feedback"),
    ratedBy: formData.get("ratedBy") ?? "ceo",
  })

  if (!submission.success) {
    const message = submission.error.issues.map((issue) => issue.message).join(", ") || "Invalid submission"
    return { status: "error", message }
  }

  const { bookingId, rating, feedback, ratedBy } = submission.data
  const feedbackValue = feedback ?? null
  const ratedByValue = ratedBy ?? "ceo"

  const { error } = await serviceClient
    .from("bookings")
    .update({
      sales_service_rating: rating,
      sales_service_feedback: feedbackValue,
      sales_service_rated_by: ratedByValue,
      sales_service_rated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)

  if (error) {
    return { status: "error", message: error.message }
  }

  revalidatePath(`/bookings/${bookingId}`)

  return { status: "success", message: "Score updated" }
}
