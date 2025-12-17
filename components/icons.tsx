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
