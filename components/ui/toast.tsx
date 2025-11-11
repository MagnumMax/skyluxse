"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toastVariants = cva(
  "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[18px] border border-border/60 bg-background/95 px-4 py-3 shadow-lg backdrop-blur",
  {
    variants: {
      variant: {
        default: "border-border/60",
        success: "border-emerald-300 bg-emerald-50 text-emerald-900",
        destructive: "border-rose-300 bg-rose-50 text-rose-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const ToastContext = React.createContext<{
  toasts: ToastConfig[]
  pushToast: (toast: ToastConfig) => void
  dismissToast: (id: string) => void
} | null>(null)

type ToastConfig = {
  id?: string
  title: string
  description?: string
  variant?: VariantProps<typeof toastVariants>["variant"]
  duration?: number
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastConfig[]>([])

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = React.useCallback(
    (toast: ToastConfig) => {
      const id = toast.id ?? crypto.randomUUID()
      setToasts((prev) => [...prev, { ...toast, id }])
      const timeout = toast.duration ?? 6000
      setTimeout(() => dismissToast(id), timeout)
    },
    [dismissToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, pushToast, dismissToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div key={toast.id} className={cn(toastVariants({ variant: toast.variant }))}>
            <div>
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? <p className="text-xs text-muted-foreground">{toast.description}</p> : null}
            </div>
            <button
              className="pointer-events-auto text-xs text-muted-foreground hover:text-foreground"
              onClick={() => dismissToast(toast.id!)}
            >
              Close
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
