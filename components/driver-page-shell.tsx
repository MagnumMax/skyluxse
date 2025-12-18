import { ReactNode } from "react"

import { cn } from "@/lib/utils"

type DriverPageShellProps = {
  children: ReactNode
  className?: string
}

export function DriverPageShell({ children, className }: DriverPageShellProps) {
  return (
    <div className={cn("mx-auto flex min-h-screen w-full flex-col gap-6 bg-background text-foreground pb-8 text-base transition-colors duration-300", className)}>
      {children}
    </div>
  )
}
