import { getAnalyticsSnapshot } from "@/lib/data/analytics"
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

      <Card className="rounded-[24px] border-border/70 bg-background/90 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {rangeOptions.map((option) => (
            <Button
              key={option}
              variant="outline"
              size="sm"
              className="h-auto rounded-full border-border/60 px-4 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground"
            >
              {rangeLabels[option]}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-auto rounded-full border-border/60 px-4 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground"
          >
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[24px] border-border/70 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Sales service score
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="mt-1 text-3xl font-semibold text-foreground">{rating.average.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">{rating.caption}</p>
            <p className="mt-3 text-xs text-muted-foreground/80">{rating.updated}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="space-y-5 rounded-[28px] border-border/70 bg-background/90 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Sales pipeline</CardTitle>
            <CardDescription>Lead status, forecast, and velocity.</CardDescription>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {pipeline.map((stage) => (
            <Card
              key={stage.id}
              className="rounded-2xl border-border/70 bg-card/80 p-4 text-sm text-muted-foreground shadow-sm"
            >
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                {stage.label}
              </p>
              <p className="text-2xl font-semibold text-foreground">{stage.value}</p>
              <p className="text-xs">Velocity {stage.velocity}</p>
              <p className="text-xs">Probability {stage.probability}</p>
            </Card>
          ))}
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[28px] border-border/70 bg-card/80 p-6 shadow-sm">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-lg font-semibold text-foreground">Revenue by manager</CardTitle>
            <CardDescription>7-day window</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="mt-2 space-y-3">
              {managerRevenue.map((entry) => (
                <div key={entry.manager} className="flex items-center gap-3">
                  <div className="w-24 text-sm font-semibold text-muted-foreground">{entry.manager}</div>
                  <div className="flex-1 rounded-full bg-muted/40">
                    <span
                      className="block rounded-full bg-primary/80 text-[0px]"
                      style={{
                        width: `${(entry.revenue / managerRevenue[0].revenue) * 100}%`,
                        height: "0.5rem",
                      }}
                    >
                      &nbsp;
                    </span>
                  </div>
                  <div className="w-24 text-right text-sm text-muted-foreground">
                    AED {entry.revenue.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/70 bg-card/80 p-6 shadow-sm">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-lg font-semibold text-foreground">Booking sources</CardTitle>
            <CardDescription>Share of net revenue</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="mt-2 space-y-3">
              {sourceBreakdown.map((source) => (
                <div
                  key={source.source}
                  className="flex items-center justify-between text-sm text-muted-foreground"
                >
                  <span>{source.source}</span>
                  <Badge
                    variant="outline"
                    className="border-border/60 text-xs font-semibold text-muted-foreground"
                  >
                    {source.value}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </DashboardPageShell>
  )
}
