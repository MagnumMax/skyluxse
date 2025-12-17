"use client"

import { FormEvent, useState } from "react"
import type { Route } from "next"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { loginAsDriver, loginAsRole } from "./actions"

type RoleOption = {
  value: string
  label: string
}

type LoginFormProps = {
  roles: readonly RoleOption[]
  roleRoutes: Record<RoleOption["value"], string>
}
const DEFAULT_OPERATIONS_ROUTE = "/fleet-calendar"

export function LoginForm({ roles, roleRoutes }: LoginFormProps) {
  const router = useRouter()
  const defaultRole = roles[1]?.value ?? roles[0]?.value ?? "operations"
  const [selectedRole, setSelectedRole] = useState(defaultRole)
  const [email, setEmail] = useState("fleet@skyluxse.ae")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fallbackRoute = roleRoutes.operations ?? DEFAULT_OPERATIONS_ROUTE

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setError("Enter your work email")
      return
    }

    setError(null)
    setIsSubmitting(true)

    if (selectedRole === "driver") {
      await loginAsDriver(normalizedEmail)
    }
    
    await loginAsRole(selectedRole)

    const nextRoute = roleRoutes[selectedRole] ?? fallbackRoute
    router.push(nextRoute as Route)
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="login-role" className="text-sm font-medium text-foreground">
          Role
        </Label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger id="login-role" className="h-11 rounded-2xl bg-muted/60">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-email" className="text-sm font-medium text-foreground">
          Email/Phone
        </Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 rounded-2xl bg-muted/60"
          placeholder="fleet@skyluxse.ae"
        />
        {error ? (
          <p className="text-sm text-destructive" role="status">
            {error}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="otp" className="text-sm font-medium text-foreground">
          One-time code
        </Label>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">MFA support will be available after integration.</p>
          <Button variant="secondary" type="button" className="h-11 w-full rounded-2xl border border-border/70">
            Send code
          </Button>
        </div>
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-2xl text-base font-semibold"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Redirecting..." : "Sign in"}
      </Button>
    </form>
  )
}
