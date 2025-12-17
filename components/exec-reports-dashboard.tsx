import { getExecReportsSnapshot } from "@/lib/data/analytics"
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ParameterList, type ParameterListItem } from "@/components/parameter-list"

const currencyFormatter = new Intl.NumberFormat("en-CA", { style: "currency", currency: "AED", maximumFractionDigits: 0 })
const dateFormatter = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "Asia/Dubai" })
const percentFormatter = new Intl.NumberFormat("en-CA", { style: "percent", maximumFractionDigits: 0 })

export async function ExecReportsDashboard() {
  const { financials, revenueDaily, topVehicles, channelMix, periodLabel } = await getExecReportsSnapshot()

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Financial & fleet performance" />

      <Card className="rounded-[26px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Financial snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ParameterList items={financialParameters(financials)} columns={3} valueSize="xl" />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Revenue vs expenses
            </CardTitle>
            <CardDescription>Daily trend for {periodLabel}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {revenueDaily.map((point) => (
                <div key={point.date} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-foreground">
                      {dateFormatter.format(new Date(point.date))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expenses {currencyFormatter.format(point.expenses)}
                    </p>
                  </div>
                  <p className="text-base font-semibold text-foreground">
                    {currencyFormatter.format(point.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[26px] border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Top vehicles by revenue
            </CardTitle>
            <CardDescription>
              Ranked by utilisation-weighted mileage contribution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {topVehicles.map((vehicle, index) => (
                <li
                  key={vehicle.name}
                  className="flex items-center justify-between border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <div>
                      <p className="font-semibold text-foreground">{vehicle.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Utilisation {percentFormatter.format(vehicle.utilization)}
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-semibold text-foreground">
                    {currencyFormatter.format(vehicle.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[26px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Channel mix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ParameterList items={channelMixItems(channelMix)} columns={3} />
        </CardContent>
      </Card>
    </DashboardPageShell>
  )
}

function financialParameters(financials: { revenue: number; expenses: number; profit: number }): ParameterListItem[] {
  return [
    { label: "Revenue", value: currencyFormatter.format(financials.revenue), valueToneClassName: "text-emerald-600" },
    { label: "Expenses", value: currencyFormatter.format(financials.expenses), valueToneClassName: "text-rose-600" },
    { label: "Profit", value: currencyFormatter.format(financials.profit), valueToneClassName: "text-indigo-600" },
  ]
}

function channelMixItems(channelMix: { channel: string; revenue: number; share: number }[]): ParameterListItem[] {
  return channelMix.map((channel) => ({
    label: channel.channel,
    value: currencyFormatter.format(channel.revenue),
    helper: percentFormatter.format(channel.share),
  }))
}
