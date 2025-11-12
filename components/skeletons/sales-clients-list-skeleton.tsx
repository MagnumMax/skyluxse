import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { Skeleton } from "@/components/ui/skeleton"

export function SalesClientsListSkeleton() {
  return (
    <DashboardPageShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-32 rounded-2xl" />
          <Skeleton className="h-10 w-44 rounded-2xl" />
        </div>
      </div>

      <div className="rounded-[26px] border border-border/70 bg-background/95 p-4">
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-32 rounded-full" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-[26px] border border-border/70 bg-background/95 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-4 w-40" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-52" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, chipIndex) => (
                <Skeleton key={chipIndex} className="h-5 w-20 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardPageShell>
  )
}
