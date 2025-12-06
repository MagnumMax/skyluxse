"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { createSalesOrderForBooking } from "@/app/actions/zoho"
import { Button } from "@/components/ui/button"

export function CreateSalesOrderButton({ bookingId }: { bookingId: string }) {
    const [isPending, startTransition] = useTransition()

    const handleCreate = () => {
        startTransition(async () => {
            const result = await createSalesOrderForBooking(bookingId)
            if (result.success) {
                toast.success("Sales Order created in Zoho Books")
            } else {
                toast.error(result.error || "Failed to create Sales Order")
            }
        })
    }

    return (
        <Button
            onClick={handleCreate}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="text-xs font-medium uppercase tracking-wider"
        >
            {isPending ? "Creating..." : "Create Sales Order in Zoho"}
        </Button>
    )
}
