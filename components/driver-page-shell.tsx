import { ReactNode } from "react"

import { cn } from "@/lib/utils"

type DriverPageShellProps = {
  children: ReactNode
  className?: string
}

export function DriverPageShell({ children, className }: DriverPageShellProps) {
  return (
    <div className={cn("mx-auto flex w-full flex-col gap-6 py-8 text-[16px] text-white sm:text-base", className)}>
      {children}
    </div>
  )
}
