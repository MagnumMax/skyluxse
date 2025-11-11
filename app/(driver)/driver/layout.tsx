import type { Metadata, Viewport } from "next"
import { ReactNode } from "react"

export const metadata: Metadata = {
  title: {
    default: "SkyLuxse Driver",
    template: "%s · Driver · SkyLuxse",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-4">
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.5em] text-slate-400">Driver</p>
          <h1 className="text-xl font-semibold tracking-tight text-white">SkyLuxse field ops</h1>
        </div>
        <button className="rounded-full border border-white/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
          Online
        </button>
      </header>
      <main className="mx-auto w-full max-w-md space-y-5 px-4 py-6">{children}</main>
    </div>
  )
}
