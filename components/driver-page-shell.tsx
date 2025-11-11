import { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function DriverPageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5", className)}>{children}</div>
}
