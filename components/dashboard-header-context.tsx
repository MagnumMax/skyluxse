"use client"

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react"

type DashboardHeaderContextValue = {
  contextualContent: ReactNode | null
  setContextualContent: (content: ReactNode | null) => void
}

const DashboardHeaderContext = createContext<DashboardHeaderContextValue | null>(null)

export function DashboardHeaderProvider({ children }: { children: ReactNode }) {
  const [contextualContent, setContextualContent] = useState<ReactNode | null>(null)

  const value = useMemo(
    () => ({
      contextualContent,
      setContextualContent,
    }),
    [contextualContent]
  )

  return <DashboardHeaderContext.Provider value={value}>{children}</DashboardHeaderContext.Provider>
}

export function useDashboardHeaderContext() {
  return useContext(DashboardHeaderContext)
}

export function DashboardHeaderSlot({ children }: { children: ReactNode }) {
  const context = useDashboardHeaderContext()

  useEffect(() => {
    if (!context) return
    context.setContextualContent(children ?? null)
    return () => context.setContextualContent(null)
  }, [children, context])

  return null
}
