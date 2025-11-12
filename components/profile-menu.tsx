"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, LogOut, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type ProfileMenuProps = {
  className?: string
  placement?: "top" | "bottom"
  onNavigate?: () => void
}

const profileName = "Anna Koval"
const profileRole = "Head of Operations"
const profileInitials = "AK"
const profileHref = "/fleet-calendar?role=operations"
const logoutHref = "/login"

type RouterPushInput = Parameters<ReturnType<typeof useRouter>["push"]>[0]

export function ProfileMenu({ className, placement = "top", onNavigate }: ProfileMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!dropdownRef.current || !triggerRef.current) return
      if (
        target &&
        (dropdownRef.current.contains(target) || triggerRef.current.contains(target))
      ) {
        return
      }
      closeMenu()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu()
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("mousedown", handlePointer)
    document.addEventListener("touchstart", handlePointer)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handlePointer)
      document.removeEventListener("touchstart", handlePointer)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [closeMenu, open])

  const handleNavigate = (href: string) => {
    router.push(href as RouterPushInput)
    onNavigate?.()
    closeMenu()
  }

  return (
    <div className={cn("relative w-full", className)}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/90 p-3 text-left transition hover:border-primary/60"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {profileInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{profileName}</p>
          <p className="text-xs text-muted-foreground">{profileRole}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        ref={dropdownRef}
        className={cn(
          "absolute left-0 right-0 z-50 mt-3 rounded-2xl border border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur",
          placement === "top" ? "bottom-full mb-3 mt-0" : "top-full"
        )}
        hidden={!open}
      >
        <div className="rounded-xl border border-border/50 bg-background/95 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{profileName}</p>
          <p className="text-xs text-muted-foreground">{profileRole}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">anna.koval@skyluxse.ae</p>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <Button variant="outline" className="w-full justify-center" onClick={() => handleNavigate(profileHref)}>
            <UserRound className="h-4 w-4" />
            Profile settings
          </Button>
          <Button
            variant="outline"
            className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => handleNavigate(logoutHref)}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>
    </div>
  )
}
