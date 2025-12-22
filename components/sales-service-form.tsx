"use client"

import { useActionState, useMemo, useState } from "react"
import { useFormStatus } from "react-dom"

import type { RateSalesServiceState } from "@/app/actions/rate-sales-service"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const DEFAULT_STATE: RateSalesServiceState = { status: "idle" }
const STAR_COUNT = 10
const STAR_COLORS = [
  "#dc2626",
  "#e11d48",
  "#f97316",
  "#fb923c",
  "#facc15",
  "#bef264",
  "#a3e635",
  "#84cc16",
  "#4ade80",
  "#22c55e",
]

type SalesServiceFormProps = {
  action: (state: RateSalesServiceState, formData: FormData) => Promise<RateSalesServiceState>
  bookingId: string
  initialRating?: number
  initialFeedback?: string | null
}

export function SalesServiceForm({ action, bookingId, initialRating, initialFeedback }: SalesServiceFormProps) {
  const [state, formAction] = useActionState(action, DEFAULT_STATE)
  const [rating, setRating] = useState(() => (initialRating && initialRating > 0 ? initialRating : 0))
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const feedbackPlaceholder = useMemo(() => "Add context for the sales handoff", [])
  const effectiveRating = hoverRating ?? rating
  const canSubmit = rating > 0

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="space-y-2">
        <Label htmlFor={`sales-rating-${bookingId}`} className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Score (1-10)
        </Label>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Sales service score">
          <input
            id={`sales-rating-${bookingId}`}
            name="rating"
            type="number"
            className="sr-only"
            readOnly
            min={1}
            max={10}
            value={rating > 0 ? rating : ""}
            required
          />
          {Array.from({ length: STAR_COUNT }).map((_, index) => {
            const value = index + 1
            const active = value <= effectiveRating
            return (
              <button
                key={value}
                type="button"
                aria-label={`Score ${value}`}
                aria-checked={rating === value}
                role="radio"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(null)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border border-border/40 transition",
                  active ? "bg-background/80" : "bg-muted/60",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("text-lg", active ? "font-semibold" : "text-muted-foreground")}
                  style={{ color: active ? STAR_COLORS[index] : undefined }}
                >
                  {active ? "★" : "☆"}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`sales-feedback-${bookingId}`}>Feedback</Label>
        <Textarea
          id={`sales-feedback-${bookingId}`}
          name="feedback"
          defaultValue={initialFeedback ?? ""}
          placeholder={feedbackPlaceholder}
          rows={3}
          maxLength={1000}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <FormStatusMessage state={state} />
        <SubmitButton disabled={!canSubmit} />
      </div>
    </form>
  )
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="secondary" disabled={disabled} isLoading={pending} className="sm:self-end">
      Save score
    </Button>
  )
}

function FormStatusMessage({ state }: { state: RateSalesServiceState }) {
  if (state.status === "idle") {
    return <p className="text-xs text-muted-foreground">Only the CEO can change this score.</p>
  }
  if (state.status === "error") {
    return <p className="text-sm text-destructive">{state.message ?? "Failed to save"}</p>
  }
  return <p className="text-sm text-emerald-500">{state.message ?? "Saved"}</p>
}
