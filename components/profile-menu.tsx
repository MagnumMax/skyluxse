"use client"

import { ChevronDown, LogOut, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ProfileMenuProps = {
  className?: string
  placement?: "top" | "bottom" | "bottom-end"
  onNavigate?: () => void
}

const profileInitials = "AK"
const profileHref = "/fleet-calendar?role=operations"
const logoutHref = "/login"

type RouterPushInput = Parameters<ReturnType<typeof useRouter>["push"]>[0]

export function ProfileMenu({ className, placement = "top", onNavigate }: ProfileMenuProps) {
  const router = useRouter()

  const handleNavigate = (href: string) => {
    router.push(href as RouterPushInput)
    onNavigate?.()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-1.5 py-1 text-sm font-medium text-white shadow-sm transition hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            className
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {profileInitials}
          </span>
          <ChevronDown className="h-4 w-4 text-white/90 transition-transform" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={placement === "top" ? "top" : "bottom"}
        sideOffset={10}
        className="w-64 rounded-2xl border border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur"
      >
        <div className="flex flex-col gap-2">
          <DropdownMenuItem
            className="p-0"
            onSelect={(event) => {
              event.preventDefault()
              handleNavigate(profileHref)
            }}
          >
            <Button variant="outline" className="w-full justify-center">
              <UserRound className="h-4 w-4" />
              Profile settings
            </Button>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="p-0"
            onSelect={(event) => {
              event.preventDefault()
              handleNavigate(logoutHref)
            }}
          >
            <Button
              variant="outline"
              className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
