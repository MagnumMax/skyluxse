import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function ClientWorkspaceSkeleton() {
  return (
    <DashboardPageShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center">
          <div className="min-w-[180px] rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-32" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 w-32 rounded-2xl" />
            <Skeleton className="h-11 w-40 rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-32 rounded-full" />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-36 rounded-full" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonCard className="lg:col-span-2">
          <SectionTitleSkeleton />
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <ListSkeleton />
            <ListSkeleton />
          </div>
        </SkeletonCard>

        <SkeletonCard>
          <SectionTitleSkeleton />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <ListItemSkeleton key={index} />
            ))}
          </div>
          <div className="mt-5 space-y-3">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 3 }).map((_, index) => (
              <ListItemSkeleton key={index} />
            ))}
          </div>
        </SkeletonCard>
      </div>

      <SkeletonCard>
        <Skeleton className="h-4 w-28" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      </SkeletonCard>
    </DashboardPageShell>
  )
}

function SkeletonCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[26px] border border-border/70 bg-background/95 p-5 shadow-sm", className)}>{children}</div>
  )
}

function SectionTitleSkeleton() {
  return (
    <div className="space-y-1">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <ListItemSkeleton key={index} />
      ))}
    </div>
  )
}

function ListItemSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 px-3 py-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  )
}
