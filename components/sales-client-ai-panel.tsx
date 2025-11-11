"use client"

import { useEffect, useState } from "react"

import type { ClientPreferences } from "@/lib/domain/entities"

export function ClientAiPanel({
  clientName,
  segment,
  outstanding,
  preferences,
}: {
  clientName: string
  segment: string
  outstanding: number
  preferences: ClientPreferences
}) {
  const [lines, setLines] = useState<string[]>(["Analysing recent signals…"])

  useEffect(() => {
    const suggestions = [
      `Lead ${clientName} prefers ${preferences.notifications.join(", ")}.`,
      outstanding > 0
        ? `Recommend nudging outstanding AED ${outstanding.toLocaleString()} before next rental.`
        : `${clientName} has no outstanding balance. Focus on upselling chauffeur package.`,
      `Segment insight: ${segment} customers convert 18% faster with WhatsApp follow-ups.`,
    ]
    let idx = 0
    const interval = setInterval(() => {
      setLines((prev) => [...prev, suggestions[idx]])
      idx += 1
      if (idx >= suggestions.length) {
        clearInterval(interval)
      }
    }, 1200)
    return () => clearInterval(interval)
  }, [clientName, outstanding, preferences.notifications, segment])

  return (
    <section className="rounded-[26px] border border-dashed border-primary/40 bg-primary/5 p-5 shadow-inner">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">AI Copilot</p>
      <p className="text-lg font-semibold text-primary">Suggested next actions</p>
      <div className="mt-3 space-y-2 text-sm text-primary">
        {lines.map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>
    </section>
  )
}
