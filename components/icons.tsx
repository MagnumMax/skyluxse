import { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  Car,
  Users,
  BarChart3,
  FileSpreadsheet,
  Workflow,
  Settings,
  Briefcase,
} from "lucide-react"

export type NavIcon =
  | "dashboard"
  | "calendar"
  | "tasks"
  | "fleet"
  | "clients"
  | "analytics"
  | "reports"
  | "integrations"
  | "settings"
  | "services"

const iconMap: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  tasks: ClipboardCheck,
  fleet: Car,
  clients: Users,
  analytics: BarChart3,
  reports: FileSpreadsheet,
  integrations: Workflow,
  settings: Settings,
  services: Briefcase,
}

export function Icon({ name, className }: { name: NavIcon; className?: string }) {
  const Component = iconMap[name]
  return <Component className={className} />
}

export function KommoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M19.5 4.5H13a4.5 4.5 0 0 0-4.5 4.5v6a4.5 4.5 0 0 0 4.5 4.5h1.02l1.04 2.08a.75.75 0 0 0 1.33-.04L17.98 19.5H19.5A4.5 4.5 0 0 0 24 15v-2.5A8 8 0 0 0 19.5 4.5Zm-15 2H8a1.5 1.5 0 1 1 0 3H6v6a3 3 0 0 1-3 3H1.5a1.5 1.5 0 0 1 0-3H2v-6A3 3 0 0 1 4.5 6.5Zm7.22 2.17c.28-.42.72-.67 1.26-.67H18c.83 0 1.5.67 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-.83a1.5 1.5 0 0 0-1.36.9l-.16.36-.56-.98a1.25 1.25 0 0 0-1.09-.62H14c-.83 0-1.5-.67-1.5-1.5v-5.5c0-.21.06-.42.22-.68Z"
      />
    </svg>
  )
}
