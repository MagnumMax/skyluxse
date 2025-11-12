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

  const handleNavigate = (href: string) => {
    router.push(href as RouterPushInput)
    onNavigate?.()
  }

  return (
    <div className={cn("relative w-full", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/90 p-3 text-left transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {profileInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{profileName}</p>
              <p className="text-xs text-muted-foreground">{profileRole}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side={placement === "top" ? "top" : "bottom"}
          sideOffset={12}
          className="w-64 rounded-2xl border border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur"
        >
          <div className="rounded-xl border border-border/50 bg-background/95 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{profileName}</p>
            <p className="text-xs text-muted-foreground">{profileRole}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              anna.koval@skyluxse.ae
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <DropdownMenuItem
              className="p-0"
              onSelect={(event) => {
                event.preventDefault()
                handleNavigate(profileHref)
              }}
            >
              <Button
                variant="outline"
                className="w-full justify-center"
              >
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
    </div>
  )
}
