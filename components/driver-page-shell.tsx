import { ReactNode } from "react"

import { cn } from "@/lib/utils"

type DriverPageShellProps = {
  children: ReactNode
  className?: string
}

export function DriverPageShell({ children, className }: DriverPageShellProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 text-white", className)}>
      {children}
    </div>
  )
}
