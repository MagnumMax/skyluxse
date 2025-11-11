import { ReactNode } from "react"

interface AppSurfacePlaceholderProps {
  title: string
  persona: string
  description: string
  parityId?: string
  children?: ReactNode
}

export function AppSurfacePlaceholder({
  title,
  persona,
  description,
  parityId,
  children,
}: AppSurfacePlaceholderProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-dashed border-border/80 bg-card/60 p-6 text-sm text-muted-foreground">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {persona}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p>{description}</p>
        {parityId ? (
          <p className="text-xs text-muted-foreground/80">
            Reference ID: <span className="font-mono">{parityId}</span>
          </p>
        ) : null}
      </div>
      <div className="rounded-lg border border-border/60 bg-background p-4 text-foreground">
        <p className="text-sm text-muted-foreground">Placeholder content — replace with the live experience.</p>
        {children}
      </div>
    </section>
  )
}
