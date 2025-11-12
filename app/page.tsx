import Link from "next/link"
import type { Route } from "next"
import { Button } from "@/components/ui/button"

const route = <T extends string>(path: T) => path as Route

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b border-border/40 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            SkyLuxse ERP
          </Link>
          <div className="space-x-2">
            <Button variant="ghost" asChild>
              <Link href={route("/login")}>Log in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex min-h-[calc(100vh-4rem)] flex-col justify-center px-6 py-16">
        <section className="max-w-3xl space-y-6">
          <p className="inline-flex rounded-full border border-primary/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
            Executive mobility control centre for growth-minded fleets
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Automation-first operations hub for premium mobility teams.
          </h1>
          <p className="text-lg text-muted-foreground">
            Unified command centre aligning sales, fleet, and finance around live KPIs, Supabase automations, and
            concierge-grade workflows.
          </p>
        </section>
      </main>
    </div>
  )
}
