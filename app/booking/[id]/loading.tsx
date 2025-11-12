import { Loader2 } from "lucide-react"

export default function BookingPublicPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="flex flex-col items-center gap-3 rounded-[32px] border border-border/60 bg-background/95 px-6 py-8 shadow-lg shadow-black/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading booking detail...</p>
      </div>
    </div>
  )
}
