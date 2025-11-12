"use client"

import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function BookingPublicPageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="flex flex-col gap-4 rounded-[32px] border border-border/60 bg-background/95 px-6 py-8 text-center shadow-lg shadow-black/5">
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">Booking temporarily unavailable</p>
          <p className="text-sm text-muted-foreground">We could not load this booking. Please try again or return to the main page.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
