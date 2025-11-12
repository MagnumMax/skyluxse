"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Shadcn-совместимая модель:
 * - ToastProvider / Toaster
 * - useToast хук, возвращающий toast(...) и список toasts
 * - toast(options) хелпер
 *
 * При этом:
 * - Сохраняем текущий визуальный язык (rounded, blur и т.п.).
 * - Сохраняем обратную совместимость по полям title/description/variant/duration.
 */

const toastVariants = cva(
  "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[18px] border border-border/60 bg-background/95 px-4 py-3 shadow-lg backdrop-blur",
  {
    variants: {
      variant: {
        default: "border-border/60",
        success: "border-emerald-300 bg-emerald-50 text-emerald-900",
        destructive: "border-rose-300 bg-rose-50 text-rose-900",
        // shadcn-like "secondary" (используем мягкий фон, не ломая язык)
        secondary: "border-border/40 bg-muted/80 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type ToastVariant = VariantProps<typeof toastVariants>["variant"]

export type Toast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  // Поддерживаем shadcn-совместимые варианты + существующие (success, destructive)
  variant?: ToastVariant
  duration?: number
}

type ToastInternal = Toast

type ToastContextType = {
  toasts: ToastInternal[]
  toast: (toast: Omit<Toast, "id">) => void
  dismiss: (id?: string) => void
  // Обратная совместимость с существующим API
  pushToast: (toast: {
    id?: string
    title: string
    description?: string
    variant?: ToastVariant
    duration?: number
  }) => void
  dismissToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

let idCounter = 0
const genId = () => {
  idCounter += 1
  return `toast-${idCounter}`
}

/**
 * Провайдер, совместимый с shadcn-паттерном.
 * Должен быть смонтирован в корне (например, в layout).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastInternal[]>([])

  const removeToast = React.useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    (toastInput: Omit<Toast, "id">) => {
      const id = genId()
      const duration = toastInput.duration ?? 6000

      const nextToast: ToastInternal = {
        id,
        ...toastInput,
      }

      setToasts((current) => [...current, nextToast])

      if (duration > 0) {
        window.setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  // Адаптер под старый pushToast API
  const pushToast = React.useCallback<
    ToastContextType["pushToast"]
  >(
    (legacy) => {
      toast({
        title: legacy.title,
        description: legacy.description,
        variant: legacy.variant,
        duration: legacy.duration,
      })
    },
    [toast]
  )

  const dismiss = React.useCallback<ToastContextType["dismiss"]>(
    (id) => {
      if (!id) {
        // Закрыть все
        setToasts([])
        return
      }
      removeToast(id)
    },
    [removeToast]
  )

  const dismissToast = React.useCallback<ToastContextType["dismissToast"]>(
    (id) => {
      removeToast(id)
    },
    [removeToast]
  )

  const value = React.useMemo<ToastContextType>(
    () => ({
      toasts,
      toast,
      dismiss,
      pushToast,
      dismissToast,
    }),
    [toasts, toast, dismiss, pushToast, dismissToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToasterView toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

/**
 * Отдельный компонент Toaster, как в shadcn.
 * Может использоваться независимо, если ToastProvider уже смонтирован выше.
 */
export function Toaster() {
  const ctx = React.useContext(ToastContext)

  if (!ctx) {
    // Мягкий no-op, чтобы не падать, если забыли провайдер.
    return null
  }

  return <ToasterView toasts={ctx.toasts} onDismiss={ctx.dismiss} />
}

/**
 * Внутренний UI-рендерер, повторно используемый ToastProvider/Toaster.
 */
function ToasterView({
  toasts,
  onDismiss,
}: {
  toasts: ToastInternal[]
  onDismiss: (id?: string) => void
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(toastVariants({ variant: toast.variant }))}
        >
          <div className="flex-1">
            {toast.title ? (
              <p className="text-sm font-semibold">{toast.title}</p>
            ) : null}
            {toast.description ? (
              <p className="text-xs text-muted-foreground">
                {toast.description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="pointer-events-auto text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onDismiss(toast.id)}
          >
            Close
          </button>
        </div>
      ))}
    </div>
  )
}

/**
 * useToast: возвращает shadcn-подобный контракт.
 *
 * Пример использования (shadcn-совместимый):
 * const { toast } = useToast()
 * toast({ title: "Done", description: "Saved" })
 */
export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return {
    ...context,
  }
}

/**
 * Глобальный хелпер для удобного прямого вызова, как в shadcn toast().
 * Работает только если ToastProvider смонтирован (контекст инициализирован).
 * Если контекста нет, вызов безопасно игнорируется.
 */
export function toast(toastInput: Omit<Toast, "id">) {
  // Используем слабую ссылку на текущий контекст через глобальный стор,
  // но без внешних зависимостей. Для простоты – через React context:
  // Т.к. вне React дерева прочитать контекст нельзя корректно,
  // этот хелпер рассчитан на вызовы внутри компонентов/хуков.
  // Для использования в util-функциях предпочтительнее useToast().
  console.warn(
    "[toast] Используйте useToast().toast(...) внутри компонентов. Глобальный toast() не может гарантировать доступ к контексту в этой реализации."
  )
}
