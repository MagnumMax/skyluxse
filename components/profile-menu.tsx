"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, LogOut, Settings, User } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type ProfileMenuProps = {
  className?: string
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
  align?: "start" | "center" | "end"
  onNavigate?: () => void
  onOpenChange?: (open: boolean) => void
  hideDetails?: boolean
}

type ProfileState = {
  initials: string
  name: string
  role: string
  email: string
  avatarUrl?: string
}

const fallbackProfile: ProfileState = {
  initials: "",
  name: "",
  role: "",
  email: "",
}

const logoutHref = "/login"

type RouterPushInput = Parameters<ReturnType<typeof useRouter>["push"]>[0]

function toInitials(nameOrEmail: string) {
  if (!nameOrEmail) return ""
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

export function ProfileMenu({ 
  className, 
  side = "top", 
  sideOffset = 8,
  align = "start",
  onNavigate, 
  onOpenChange,
  hideDetails = false 
}: ProfileMenuProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileState | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const mod = await import("@/lib/supabase/client")
        const client = mod.createClient()
        const { data: userData, error: authError } = await client.auth.getUser()
        const user = userData?.user
        
        // DIAGNOSTIC LOG START
        if (user) {
          console.group("ProfileMenu Diagnostics")
          console.log("Auth User ID:", user.id)
          console.log("Auth Email:", user.email)
          
          const { data: directCheck, error: checkError } = await client
            .from("staff_accounts")
            .select("*")
            .eq("id", user.id)
            .maybeSingle()
            
          console.log("Database Lookup Result:", directCheck)
          console.log("Database Lookup Error:", checkError)
          console.groupEnd()
        }
        // DIAGNOSTIC LOG END

        if (authError || !user) {
          console.warn("ProfileMenu: Auth error or no user", authError)
          if (!cancelled) setProfile(fallbackProfile)
          return
        }

        const { data: staff, error: staffError } = await client
          .from("staff_accounts")
          .select("full_name,email,role,avatar_url")
          .eq("id", user.id)
          .maybeSingle()
        
        // Priority: 1. Staff Profile 2. Auth Metadata 3. Auth Email
        const name = staff?.full_name || 
                    user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    (user.email ? user.email.split('@')[0] : "Guest")
                    
        const email = staff?.email || user.email || "No email"
        
        // Format role
        let role = staff?.role || "user"
        if (role.toLowerCase() === 'ceo') role = 'CEO'
        else role = role.charAt(0).toUpperCase() + role.slice(1)

        const avatarUrl = staff?.avatar_url || user.user_metadata?.avatar_url
        const initials = toInitials(name || email || "")
        
        if (!cancelled) {
          setProfile({ initials, name, role, email, avatarUrl })
        }
      } catch (error) {
        console.error("Profile loading failed:", error)
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

  const handleNavigate = (href: string) => {
    router.push(href as RouterPushInput)
    onNavigate?.()
  }

  if (!profile) {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg p-2", hideDetails ? "justify-center" : "w-full", className)}>
        <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
        {!hideDetails && (
          <div className="flex flex-1 flex-col gap-1">
            <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
            <div className="h-2 w-28 animate-pulse rounded bg-white/10" />
          </div>
        )}
      </div>
    )
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          className={cn(
            "group flex items-center gap-3 rounded-lg p-2 text-left outline-none transition-all hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-500",
            hideDetails ? "justify-center" : "w-full",
            className
          )}
        >
          <div className="relative flex shrink-0">
            <Avatar className="h-9 w-9 border border-white/10 bg-slate-800">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.name} />}
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white">
                {profile.initials}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900"
              aria-hidden
            />
          </div>
          
          {!hideDetails && (
            <>
              <div className="flex flex-1 flex-col overflow-hidden leading-none">
                <span className="truncate text-sm font-medium text-slate-200 group-hover:text-white">
                  {profile.name || "Guest"}
                </span>
                <span className="truncate text-xs text-slate-400 group-hover:text-slate-300">
                  {profile.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-slate-300" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        side={side}
        sideOffset={sideOffset}
        align={align}
        className="w-64 rounded-xl border-white/10 bg-slate-900 p-1 text-slate-200 shadow-xl ring-1 ring-white/10 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-3 px-2 py-2.5 text-left text-sm">
            <Avatar className="h-9 w-9 border border-white/10">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.name} />}
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white">
                {profile.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col overflow-hidden leading-none">
              <span className="truncate font-medium text-white">{profile.name}</span>
              <span className="truncate text-xs text-slate-400">{profile.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-white/10" />
        
        <DropdownMenuGroup>
          <DropdownMenuItem 
            className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 focus:bg-white/10 focus:text-white"
            onSelect={() => handleNavigate("/account")}
          >
            <User className="h-4 w-4 text-slate-400 group-focus:text-white" />
            <span>Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 focus:bg-white/10 focus:text-white"
            onSelect={() => handleNavigate("/settings")}
          >
            <Settings className="h-4 w-4 text-slate-400 group-focus:text-white" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator className="bg-white/10" />
        
        <DropdownMenuItem
          className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-400 focus:bg-red-500/10 focus:text-red-400"
          onSelect={(event) => {
            event.preventDefault()
            handleNavigate(logoutHref)
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
