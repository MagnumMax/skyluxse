export const revalidate = 300 // Sales analytics snapshots refresh every 5 minutes.

import { SalesAnalyticsDashboard } from "@/components/sales-analytics-dashboard"

export default function SalesAnalyticsPage() {
  return <SalesAnalyticsDashboard />
}
