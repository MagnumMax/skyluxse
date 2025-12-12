import { ReactNode } from "react"

import { cn } from "@/lib/utils"

type DriverPageShellProps = {
  children: ReactNode
  className?: string
}

export function DriverPageShell({ children, className }: DriverPageShellProps) {
  return (
    <div className={cn("mx-auto flex w-full flex-col gap-5 py-6 text-[15px] text-white sm:text-base", className)}>
      {children}
    </div>
  )
}
