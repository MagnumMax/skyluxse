import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type AuditMetadataProps = {
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  className?: string
}

const items = [
  { key: "created", label: "Created" },
  { key: "updated", label: "Last updated" },
] as const

export function AuditMetadata({ createdAt, createdBy, updatedAt, updatedBy, className }: AuditMetadataProps) {
  const values: Record<(typeof items)[number]["key"], { timestamp?: string; actor?: string }> = {
    created: { timestamp: createdAt, actor: createdBy },
    updated: { timestamp: updatedAt, actor: updatedBy },
  }

  return (
    <div className={cn("flex flex-wrap gap-2 text-xs text-muted-foreground", className)}>
      {items.map((item) => {
        const timestamp = formatDateTime(values[item.key].timestamp)
        const actor = normalizeActor(values[item.key].actor)
        return (
          <div key={item.key} className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1">
            <span className="font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">{item.label}</span>
            <span className="font-semibold text-foreground">
              {timestamp}
              <span className="text-muted-foreground"> · by {actor}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function normalizeActor(value?: string) {
  if (!value) return "—"
  return value
}
