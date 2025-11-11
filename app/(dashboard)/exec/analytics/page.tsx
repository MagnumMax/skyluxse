export const revalidate = 300 // Executive analytics refresh on a 5-minute cadence.

import { ExecAnalyticsDashboard } from "@/components/exec-analytics-dashboard"

export default function ExecAnalyticsPage() {
  return <ExecAnalyticsDashboard />
}
