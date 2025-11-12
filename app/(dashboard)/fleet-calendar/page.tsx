export const dynamic = "force-dynamic" // Fleet calendar must stay in sync for every role.

import { renderFleetCalendar } from "@/app/(dashboard)/fleet-calendar/fleet-calendar-view"

export default async function FleetCalendarSharedPage() {
  return renderFleetCalendar()
}
