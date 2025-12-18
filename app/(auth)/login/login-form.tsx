"use client"

import { FormEvent, useState } from "react"
import type { Route } from "next"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { login } from "./actions"

const ROLE_ROUTES: Record<string, string> = {
  operations: "/fleet-calendar",
  sales: "/fleet-calendar",
  ceo: "/exec/dashboard",
  driver: "/driver/tasks",
}
const DEFAULT_ROUTE = "/fleet-calendar"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim()

    if (!normalizedEmail || !password) {
      setError("Email and password are required")
      return
    }

    setError(null)
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append("email", normalizedEmail)
    formData.append("password", password)

    try {
      const result = await login(formData)
      
      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      if (result.success && result.role) {
        const nextRoute = ROLE_ROUTES[result.role] ?? DEFAULT_ROUTE
        router.push(nextRoute as Route)
      } else {
        // Fallback if something weird happens
        router.push(DEFAULT_ROUTE as Route)
      }
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred")
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="login-email" className="text-sm font-medium text-foreground">
          Email
        </Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 rounded-2xl bg-muted/60"
          placeholder="name@skyluxse.ae"
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password" className="text-sm font-medium text-foreground">
          Password
        </Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 rounded-2xl bg-muted/60"
          placeholder="Enter your password"
          autoComplete="current-password"
        />
        {error ? (
          <p className="text-sm text-destructive" role="status">
            {error}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-2xl text-base font-semibold"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  )
}
