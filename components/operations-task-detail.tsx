import Link from "next/link"
import NextImage from "next/image"

import type { OperationsTask } from "@/lib/domain/entities"
import { BOOKING_PRIORITIES } from "@/lib/constants/bookings"
import { DashboardHeaderSlot } from "@/components/dashboard-header-context"
import { OperationsTaskCard } from "@/components/operations-task-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ParameterList, type ParameterListItem } from "@/components/parameter-list"
import { AdditionalService, TaskAdditionalService } from "@/lib/domain/additional-services"
import { formatDateTime } from "@/lib/formatters"
import { ServiceSelector } from "@/components/service-selector"

export function OperationsTaskDetail({ task, additionalServices, availableServices, handoverPhotos }: { task: OperationsTask; additionalServices?: TaskAdditionalService[]; availableServices?: AdditionalService[], handoverPhotos?: string[] }) {
  const priorityMeta = BOOKING_PRIORITIES[task.priority.toLowerCase() as keyof typeof BOOKING_PRIORITIES] ?? {
    label: task.priority,
    className: "bg-slate-200 text-slate-700",
  }
  const completionPct = task.requiredInputProgress.total
    ? Math.round((task.requiredInputProgress.completed / task.requiredInputProgress.total) * 100)
    : 0
  return (
    <div className="space-y-6">
      <DashboardHeaderSlot>{null}</DashboardHeaderSlot>

      <Button asChild variant="outline" size="sm" className="rounded-full px-4 py-2">
        <Link href="/tasks">← Back to tasks</Link>
      </Button>

      <OperationsTaskCard task={task} />

      <Card className="rounded-[26px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Task summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ParameterList items={buildTaskParameters(task, priorityMeta.label)} columns={3} />
        </CardContent>
      </Card>

      <ServiceSelector 
        entityId={String(task.id)} 
        entityType="task" 
        initialServices={additionalServices ?? []} 
        availableServices={availableServices ?? []} 
        readOnly={task.status === "done"}
      />

      {handoverPhotos && handoverPhotos.length > 0 ? (
        <Accordion type="single" collapsible className="rounded-[26px] border border-border/70 bg-card/80 px-6">
          <AccordionItem value="handover-photos" className="border-none">
            <AccordionTrigger className="hover:no-underline py-6">
               <span className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Handover Photos</span>
            </AccordionTrigger>
            <AccordionContent>
                <div className="grid gap-2 sm:grid-cols-2 pb-6">
                    {handoverPhotos.map((image) => (
                    <div key={image} className="overflow-hidden rounded-2xl border border-border/60 bg-muted/50 relative h-32">
                        <a href={image} target="_blank" rel="noreferrer" className="block h-full w-full relative">
                        <NextImage src={image} alt="Handover" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                        </a>
                    </div>
                    ))}
                </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}

      <Card className="rounded-[28px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{task.description}</p>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Required inputs</CardTitle>
          <CardDescription>
            {task.requiredInputProgress.total > 0
              ? `${task.requiredInputProgress.completed}/${task.requiredInputProgress.total} captured`
              : "No required inputs configured"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {task.requiredInputProgress.total > 0 ? (
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          ) : null}
          {task.geo ? (
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              {task.geo.pickup ? <p>Pickup: {task.geo.pickup}</p> : null}
              {task.geo.dropoff ? <p>Drop-off: {task.geo.dropoff}</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function buildTaskParameters(task: OperationsTask, priorityLabel: string): ParameterListItem[] {
  return [
    { label: "Owner", value: task.owner, helper: task.ownerRole },
    { label: "Priority", value: priorityLabel },
    { label: "Status", value: task.status },
    { label: "Deadline", value: formatDateTime(task.deadline), helper: `SLA ${task.slaMinutes} minutes` },
    {
      label: "Related booking",
      value: task.bookingId ? (
        <Link href={`/bookings/${String(task.bookingId)}?view=operations`} className="text-sm font-semibold text-primary hover:underline">
          Open booking #{task.bookingCode ?? task.bookingId}
        </Link>
      ) : (
        "No linked booking"
      ),
    },
    { label: "Channel", value: task.channel },
  ]
}
