import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Link2,
  Telescope,
  Target,
  PenSquare,
  Palette,
  CalendarDays,
  ListChecks,
  CheckCircle2,
  Inbox,
  BarChart3,
  FileText,
  Settings2,
  Workflow,
} from "lucide-react";
import type { AgentSystemId } from "@/lib/agent-systems";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which of the 7 agent systems this section surfaces (for grouping/tooltips). */
  system?: AgentSystemId;
  section: "workspace" | "agents" | "operations" | "system";
}

// The 14 agreed dashboard sections + a traceability view.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, section: "workspace" },
  { href: "/brand", label: "Company & Brand Intelligence", icon: Building2, system: "A", section: "workspace" },
  { href: "/connections", label: "Connected Pages", icon: Link2, system: "F", section: "workspace" },

  { href: "/research", label: "Research & Trends", icon: Telescope, system: "B", section: "agents" },
  { href: "/strategy", label: "Strategy", icon: Target, system: "D", section: "agents" },
  { href: "/content", label: "Content Studio", icon: PenSquare, system: "D", section: "agents" },
  { href: "/creative", label: "Creative Studio", icon: Palette, system: "E", section: "agents" },

  { href: "/calendar", label: "Publishing Calendar", icon: CalendarDays, system: "F", section: "operations" },
  { href: "/tasks", label: "Tasks", icon: ListChecks, section: "operations" },
  { href: "/approvals", label: "Approvals", icon: CheckCircle2, system: "F", section: "operations" },
  { href: "/inbox", label: "Community Inbox", icon: Inbox, system: "F", section: "operations" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, system: "C", section: "operations" },
  { href: "/reports", label: "Weekly Reports", icon: FileText, system: "G", section: "operations" },

  { href: "/settings", label: "Automation Settings", icon: Settings2, section: "system" },
  { href: "/traceability", label: "Traceability", icon: Workflow, section: "system" },
];

export const NAV_SECTIONS: { key: NavItem["section"]; label: string }[] = [
  { key: "workspace", label: "Workspace" },
  { key: "agents", label: "Agent Studio" },
  { key: "operations", label: "Operations" },
  { key: "system", label: "System" },
];
