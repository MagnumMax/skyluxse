"use client"

import { ListFilter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { BookingStageKey } from "@/lib/constants/bookings"

type StageFilterPopoverProps = {
  filters: Record<BookingStageKey, boolean>
  onToggle: (key: BookingStageKey) => void
}

const STAGE_META: Record<BookingStageKey, { label: string; description: string }> = {
  confirmed: { label: "Confirmed bookings", description: "Docs ready; assign vehicle and driver" },
  delivery: { label: "Delivery within 24h", description: "Prep delivery run for the upcoming day" },
  "in-rent": { label: "Car with Customers", description: "Vehicle with client; monitor trip and SLA" },
  pickup: { label: "Pick up within 24h", description: "Schedule pickup and closing logistics" },
  closed: { label: "Closed", description: "Deal completed or cancelled" },
  other: { label: "Other", description: "Waiting for payment or other statuses" },
}

export function StageFilterPopover({ filters, onToggle }: StageFilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full border-white/20 bg-slate-900/60 text-slate-100"
          aria-label="Filter by stage"
        >
          <ListFilter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2 rounded-2xl border border-border/70 bg-card/95 p-3 text-sm shadow-lg" align="end">
        {Object.keys(STAGE_META).map((key) => {
          const stageKey = key as BookingStageKey
          const meta = STAGE_META[stageKey]
          if (!meta) return null
          return (
            <label
              key={stageKey}
              className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-background/40"
            >
              <Checkbox
                checked={filters[stageKey] ?? false}
                onCheckedChange={() => onToggle(stageKey)}
              />
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{meta.label}</span>
                <span className="text-xs text-muted-foreground">{meta.description}</span>
              </div>
            </label>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
