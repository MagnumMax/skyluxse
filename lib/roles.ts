import { DashboardNavGroup } from "@/components/dashboard-header"

export type UserRole = "driver" | "sales" | "operations" | "ceo"

export const ROLE_NAV_GROUPS: Record<UserRole, DashboardNavGroup[]> = {
  driver: [
    {
      label: "Driver",
      links: [
        { href: "/driver/tasks", label: "Dashboard", icon: "dashboard" },
        { href: "/driver/tasks", label: "Task", icon: "tasks" },
        { href: "/fleet", label: "Fleet", icon: "fleet" },
      ],
    },
  ],
  sales: [
    {
      label: "Sales",
      links: [
        { href: "/fleet-calendar", label: "Fleet calendar", icon: "calendar" },
        { href: "/analytics", label: "Dashboard", icon: "analytics" },
        { href: "/bookings", label: "Bookings", icon: "dashboard" },
        { href: "/fleet", label: "Fleet", icon: "fleet" },
        { href: "/clients", label: "Clients", icon: "clients" },
      ],
    },
  ],
  operations: [
    {
      label: "Operations",
      links: [
         { href: "/tasks", label: "Dashboard", icon: "dashboard" },
         { href: "/tasks", label: "Task", icon: "tasks" },
         { href: "/fleet", label: "Fleet", icon: "fleet" },
         { href: "/fleet-calendar", label: "Fleet calendar", icon: "calendar" },
         { href: "/bookings", label: "Bookings", icon: "dashboard" },
      ],
    },
  ],
  ceo: [
    {
      label: "Executive",
      links: [
        { href: "/exec/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "/exec/fleet-calendar", label: "Fleet calendar", icon: "calendar" },
        { href: "/bookings", label: "Bookings", icon: "dashboard" },
        { href: "/fleet", label: "Fleet", icon: "fleet" },
        { href: "/clients", label: "Clients", icon: "clients" },
        { href: "/exec/services", label: "Services", icon: "services" },
      ],
    },
  ],
}
