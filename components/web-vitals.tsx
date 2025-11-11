"use client"

import { useReportWebVitals } from "next/web-vitals"

type WebVitalsMetric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0]

function reportMetric(metric: WebVitalsMetric) {
  if (typeof window === "undefined") return

  const payload = JSON.stringify(metric)

  if (navigator.sendBeacon && process.env.NEXT_PUBLIC_VITALS_ENDPOINT) {
    navigator.sendBeacon(process.env.NEXT_PUBLIC_VITALS_ENDPOINT, payload)
    return
  }

  if (process.env.NODE_ENV === "development") {
    console.log("web-vitals", metric)
  }
}

export function WebVitals() {
  useReportWebVitals(reportMetric)
  return null
}
