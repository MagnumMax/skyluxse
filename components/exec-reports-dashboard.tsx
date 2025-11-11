import { getExecReportsSnapshot } from "@/lib/data/analytics"
import { cn } from "@/lib/utils"
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const currencyFormatter = new Intl.NumberFormat("en-CA", { style: "currency", currency: "AED", maximumFractionDigits: 0 })
const dateFormatter = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" })
const percentFormatter = new Intl.NumberFormat("en-CA", { style: "percent", maximumFractionDigits: 0 })

export async function ExecReportsDashboard() {
  const { financials, revenueDaily, topVehicles, channelMix, periodLabel } = await getExecReportsSnapshot()

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Financial & fleet performance" />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Revenue" value={financials.revenue} accent="text-emerald-600" />
        <MetricCard label="Expenses" value={financials.expenses} accent="text-rose-600" />
        <MetricCard label="Profit" value={financials.profit} accent="text-indigo-600" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Revenue vs expenses</CardTitle>
            <CardDescription>Daily trend for {periodLabel}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {revenueDaily.map((point) => (
                <div key={point.date} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{dateFormatter.format(new Date(point.date))}</p>
                    <p className="text-xs text-muted-foreground">Expenses {currencyFormatter.format(point.expenses)}</p>
                  </div>
                  <p className="text-base font-semibold text-foreground">{currencyFormatter.format(point.revenue)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Top vehicles by revenue</CardTitle>
            <CardDescription>Ranked by utilisation-weighted mileage contribution.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {topVehicles.map((vehicle, index) => (
                <li key={vehicle.name} className="flex items-center justify-between border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <div>
                      <p className="font-semibold text-foreground">{vehicle.name}</p>
                      <p className="text-xs text-muted-foreground">Utilisation {percentFormatter.format(vehicle.utilization)}</p>
                    </div>
                  </div>
                  <span className="text-base font-semibold text-foreground">{currencyFormatter.format(vehicle.revenue)}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[26px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Channel mix</CardTitle>
          <CardDescription>Highlights Kommo dominance and fallback channels.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {channelMix.map((channel) => (
              <div key={channel.channel} className="space-y-1 rounded-2xl border border-border/60 bg-background/60 p-3">
                <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">{channel.channel}</p>
                <p className="text-base font-semibold text-foreground">{currencyFormatter.format(channel.revenue)}</p>
                <p className="text-xs text-muted-foreground">{percentFormatter.format(channel.share)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardPageShell>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card className="rounded-[24px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-3xl font-semibold text-foreground", accent)}>{currencyFormatter.format(value)}</p>
      </CardContent>
    </Card>
  )
}
