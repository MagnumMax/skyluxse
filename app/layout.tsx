import type { Metadata } from "next"
import "./globals.css"
import { cn } from "@/lib/utils"
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
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased", brandSans.variable)}>
        <WebVitals />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
