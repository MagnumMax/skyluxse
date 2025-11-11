import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition",
  {
    variants: {
      variant: {
        primary: "bg-primary/10 text-primary border border-primary/30",
        outline: "border border-border/60 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span className={cn(badgeVariants({ variant }), className)} ref={ref} {...props} />
    )
  }
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
