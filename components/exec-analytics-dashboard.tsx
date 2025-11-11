import { getAnalyticsSnapshot } from "@/lib/data/analytics"
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"

const rangeLabels: Record<string, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Quarter",
}

export async function ExecAnalyticsDashboard() {
  const { rangeOptions, rating, pipeline, managerRevenue, sourceBreakdown } = await getAnalyticsSnapshot()
  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Insight Hub" />

      <section className="rounded-[24px] border border-border/70 bg-background/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {rangeOptions.map((option) => (
            <button key={option} className="rounded-full border border-border/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              {rangeLabels[option]}
            </button>
          ))}
          <button className="rounded-full border border-border/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Export CSV
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[24px] border border-border/70 bg-card/80 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Sales service score</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{rating.average.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">{rating.caption}</p>
          <p className="mt-3 text-xs text-muted-foreground/80">{rating.updated}</p>
        </article>
      </section>

      <section className="space-y-5 rounded-[28px] border border-border/70 bg-background/90 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sales pipeline</h2>
            <p className="text-sm text-muted-foreground">Lead status, forecast, and velocity.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {pipeline.map((stage) => (
            <div key={stage.id} className="rounded-2xl border border-border/70 bg-card/80 p-4 text-sm text-muted-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">{stage.label}</p>
              <p className="text-2xl font-semibold text-foreground">{stage.value}</p>
              <p className="text-xs">Velocity {stage.velocity}</p>
              <p className="text-xs">Probability {stage.probability}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">Revenue by manager</h3>
          <p className="text-sm text-muted-foreground">7-day window</p>
          <div className="mt-4 space-y-3">
            {managerRevenue.map((entry) => (
              <div key={entry.manager} className="flex items-center gap-3">
                <div className="w-24 text-sm font-semibold text-muted-foreground">{entry.manager}</div>
                <div className="flex-1 rounded-full bg-muted/40">
                  <span
                    className="block rounded-full bg-primary/80 text-[0px]"
                    style={{ width: `${entry.revenue / managerRevenue[0].revenue * 100}%`, height: "0.5rem" }}
                  >
                    &nbsp;
                  </span>
                </div>
                <div className="w-24 text-right text-sm text-muted-foreground">AED {entry.revenue.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">Booking sources</h3>
          <p className="text-sm text-muted-foreground">Share of net revenue</p>
          <div className="mt-4 space-y-3">
            {sourceBreakdown.map((source) => (
              <div key={source.source} className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{source.source}</span>
                <span>{source.value}%</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </DashboardPageShell>
  )
}
