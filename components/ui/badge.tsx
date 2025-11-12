import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * shadcn-совместимые варианты + маппинг для обратной совместимости.
 *
 * Поддерживаем:
 * - Официальные: default, secondary, destructive, outline
 * - Наследованные из проекта: primary (делаем алиасом к default)
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        // shadcn default
        default: "border-transparent bg-primary/10 text-primary",
        // shadcn secondary
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        // shadcn destructive
        destructive:
          "border-transparent bg-destructive/10 text-destructive",
        // shadcn outline
        outline:
          "border-border/60 text-muted-foreground",
        // backward compatibility: старый primary ведёт себя как усиленный default
        primary:
          "border border-primary/30 bg-primary/10 text-primary",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * API: <Badge variant="default" | "secondary" | "destructive" | "outline" | "primary" />
 * Совместим с shadcn (div+className) и сохраняет визуальный язык продукта.
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    // Нормализуем алиасы на случай использования старых значений.
    const normalizedVariant =
      variant === "primary" ? "primary" : variant

    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant: normalizedVariant }), className)}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
