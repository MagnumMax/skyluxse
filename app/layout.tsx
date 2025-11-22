import type { Metadata } from "next"
import "./globals.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider"
import { brandSans } from "@/lib/fonts"
import { ToastProvider } from "@/components/ui/toast"
import { WebVitals } from "@/components/web-vitals"

export const metadata: Metadata = {
  title: "SkyLuxse ERP 2.0",
  description: "Automation-forward operations hub powered by Next.js & Supabase",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", brandSans.variable)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <WebVitals />
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
