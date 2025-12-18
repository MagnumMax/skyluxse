"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type ProfileMenuProps = {
  className?: string
  placement?: "top" | "bottom" | "bottom-end"
  onNavigate?: () => void
  hideDetails?: boolean
}

type ProfileState = {
  initials: string
  name: string
  role: string
  email: string
}

const fallbackProfile: ProfileState = {
  initials: "AK",
  name: "Alex Kim",
  role: "Operations Lead",
  email: "alex.kim@skyluxse.com",
}

const logoutHref = "/login"

type RouterPushInput = Parameters<ReturnType<typeof useRouter>["push"]>[0]

function toInitials(nameOrEmail: string) {
  const trimmed = nameOrEmail.trim()
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  if (trimmed.includes("@")) {
    const user = trimmed.split("@")[0]
    if (user.length >= 2) return `${user[0]}${user[1]}`.toUpperCase()
    if (user.length === 1) return user[0].toUpperCase()
  }
  return trimmed[0]?.toUpperCase() || "U"
}

export function ProfileMenu({ className, placement = "top", onNavigate, hideDetails = false }: ProfileMenuProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileState>(fallbackProfile)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const mod = await import("@/lib/supabase/browser-client")
        const client = mod.supabaseBrowser
        const { data: userData } = await client.auth.getUser()
        const user = userData?.user
        if (!user || cancelled) return
        const { data: staff } = await client
          .from("staff_accounts")
          .select("full_name,email,role")
          .eq("id", user.id)
          .single()
        const name = staff?.full_name || user.user_metadata?.full_name || user.email || "User"
        const email = staff?.email || user.email || ""
        const role = staff?.role || "staff"
        const initials = toInitials(name || email || "")
        if (!cancelled) {
          setProfile({ initials, name, role, email })
        }
      } catch {
        if (!cancelled) {
          setProfile(fallbackProfile)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const details = useMemo(
    () => (!hideDetails ? (
      <span className="hidden min-w-[140px] flex-col text-left leading-tight sm:flex">
        <span className="text-sm font-semibold text-white">{profile.name}</span>
        <span className="text-[11px] text-white/70">{profile.role}</span>
      </span>
    ) : null),
    [hideDetails, profile.name, profile.role]
  )

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
            "group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2 py-1 text-sm font-medium text-white shadow-sm transition hover:border-white/25 hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            className
          )}
        >
          <span className="relative flex items-center">
            <Avatar className="h-10 w-10 border border-white/20 bg-white/5">
              <AvatarFallback className="bg-gradient-to-br from-slate-800 to-slate-900 text-xs font-semibold uppercase text-white">
                {profile.initials}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_2px_rgba(15,23,42,0.95)]"
              aria-hidden
            />
          </span>
          {details}
          <ChevronDown className="h-4 w-4 text-white/90 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={placement === "top" ? "top" : "bottom"}
        sideOffset={10}
        className="w-72 rounded-2xl border border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur"
      >
        <div className="flex items-start gap-3 px-1 pb-2">
          <Avatar className="h-12 w-12 border border-border/50 bg-muted/60">
            <AvatarFallback className="bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-semibold uppercase text-white">
              {profile.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-0.5">
            <p className="text-sm font-semibold text-foreground">{profile.name}</p>
            <p className="text-xs text-muted-foreground">{profile.role}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Online
          </span>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 focus:bg-red-50 focus:text-red-700"
          onSelect={(event) => {
            event.preventDefault()
            handleNavigate(logoutHref)
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
          <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-red-500">
            <Check className="h-3 w-3" aria-hidden />
            Session safe
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
