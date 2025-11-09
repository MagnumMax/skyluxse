import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu"

const primaryActions = [
  { label: "Bookings", href: "/app/bookings" },
  { label: "Fleet", href: "/app/fleet" },
  { label: "Analytics", href: "/app/analytics" },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b border-border/40 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            SkyLuxse ERP
          </Link>
          <NavigationMenu>
            <NavigationMenuList>
              {primaryActions.map((action) => (
                <NavigationMenuItem key={action.label}>
                  <Link href={action.href} legacyBehavior passHref>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      {action.label}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          <div className="space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/request-demo">Request demo</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <section className="max-w-3xl space-y-6">
          <p className="inline-flex rounded-full border border-primary/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
            Next.js App Router • Supabase • Tailwind 4
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Automation-first operations hub for premium mobility teams.
          </h1>
          <p className="text-lg text-muted-foreground">
            Modular App Router shell ready for Kommo, Zoho, AI copilots, and mobile workflows—all wired for
            Supabase and shadcn/ui components.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/app/onboarding">Launch workspace</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/docs/PRD">View PRD</Link>
            </Button>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {primaryActions.map((action) => (
            <Card key={action.label} className="border-border/40 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle>{action.label}</CardTitle>
                <CardDescription>Build App Router routes and automation for the {action.label} module.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" asChild className="w-full">
                  <Link href={action.href}>Open module</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  )
}
