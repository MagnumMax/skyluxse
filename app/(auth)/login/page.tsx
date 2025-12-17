import type { Metadata } from "next"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "SkyLuxse ERP · Login",
  description: "SkyLuxse ERP login screen with role selection and OTP request.",
}

const roles = [
  { value: "operation", label: "Operations" },
  { value: "sale", label: "Sales" },
  { value: "execution", label: "Execution" },
  { value: "driver", label: "Driver" },
] as const

const roleRoutes = {
  operation: "/fleet-calendar",
  sale: "/fleet-calendar",
  execution: "/exec/dashboard",
  driver: "/driver/tasks",
} satisfies Record<(typeof roles)[number]["value"], string>

const heroBullets = [
  "Corporate access: bookings, vehicles, and clients in one place.",
  "Automated signals for payments, deliveries, and returns.",
  "Online reports for utilization, margin, and SLA.",
]

const heroGradient =
  "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.16), transparent 55%), " +
  "radial-gradient(circle at 80% 70%, rgba(79,70,229,0.35), transparent 45%), " +
  "linear-gradient(135deg, #05070c 0%, #0b1220 40%, #111b2e 70%, #19263f 100%)"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.65fr_1.35fr]">
        <Card className="rounded-[28px] border border-border/70 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <CardHeader className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">SkyLuxse ERP</p>
            <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm roles={roles} roleRoutes={roleRoutes} />
          </CardContent>
        </Card>

        <section
          className="relative overflow-hidden rounded-[32px] border border-border/60 p-8 text-slate-50 shadow-[0_30px_60px_-45px_rgba(18,22,62,0.9)]"
          style={{ backgroundImage: heroGradient }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/50 bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
            Internal access · SkyLuxse
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight">Corporate fleet OS</h2>
          <p className="mt-3 text-base text-slate-200">
            Staff platform: bookings, SLA, and drivers unified in a single workspace.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {heroBullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
