import { getAnalyticsSnapshot } from "@/lib/data/analytics"
import { cn } from "@/lib/utils"
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const rangeLabels: Record<string, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Quarter",
}

export async function SalesAnalyticsDashboard() {
  const { rangeOptions, pipeline, managerRevenue, sourceBreakdown, rating } = await getAnalyticsSnapshot()
  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Pipeline & intelligence" />

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

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[28px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Pipeline</CardTitle>
            <CardDescription>Count, velocity, and win probability.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5">
              {pipeline.map((stage) => (
                <div key={stage.id} className="rounded-2xl border border-border/70 bg-background/90 p-4 text-sm text-muted-foreground">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">{stage.label}</p>
                  <p className="text-2xl font-semibold text-foreground">{stage.value}</p>
                  <p className="text-xs">Velocity {stage.velocity}</p>
                  <p className="text-xs">Probability {stage.probability}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-dashed border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.35em] text-primary">AI Lead Intelligence</CardTitle>
            <CardDescription className="text-primary/80">
              Placeholder copy for contextual nudges, outstanding reminders, and channel tips.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-primary">
            <p>• VIP leads converted 18% faster with WhatsApp follow-ups last week.</p>
            <p>• AED 12.3k outstanding across proposal stage — remind owners before pushing to delivery.</p>
            <p>• Instagram-origin leads have the lowest SLA compliance (74%); suggest concierge add-on.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[28px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Revenue by manager</CardTitle>
            <CardDescription>7-day revenue window for each owner.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {managerRevenue.map((entry, index) => (
                <div key={entry.manager} className="flex items-center gap-3">
                  <span className="w-4 text-muted-foreground">{index + 1}.</span>
                  <span className="w-20 font-semibold text-foreground">{entry.manager}</span>
                  <div className="flex-1 rounded-full bg-muted/40">
                    <div className="h-2 rounded-full bg-primary/80" style={{ width: `${(entry.revenue / managerRevenue[0].revenue) * 100}%` }} />
                  </div>
                  <span className="w-24 text-right text-muted-foreground">AED {entry.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Source mix</CardTitle>
            <CardDescription>Share of revenue per channel.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              {sourceBreakdown.map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <span>{source.source}</span>
                  <span>{source.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[28px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Sales service score</CardTitle>
          <CardDescription>KPI chip used across the sales surfaces.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-semibold text-foreground">{rating.average.toFixed(1)} / 10</p>
          <p className="text-sm text-muted-foreground">{rating.caption}</p>
          <p className="text-xs text-muted-foreground/80">{rating.updated}</p>
        </CardContent>
      </Card>
    </DashboardPageShell>
  )
}
