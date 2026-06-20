import {
  LayoutDashboard,
  Ticket,
  Package,
  Radio,
  Wifi,
  ShieldCheck,
  BarChart3,
  Users,
  ScrollText,
  Palette,
  Settings,
  Bug,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "./auth-context";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
  group: "Operations" | "Network" | "Insights" | "Administration";
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  cashier: "Cashier",
  technician: "Technician",
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "cashier", "technician"], group: "Operations" },
  { to: "/vouchers", label: "Vouchers", icon: Ticket, roles: ["admin", "cashier"], group: "Operations" },
  { to: "/packages", label: "Packages", icon: Package, roles: ["admin"], group: "Operations" },
  { to: "/sessions", label: "Active Sessions", icon: Radio, roles: ["admin", "cashier", "technician"], group: "Network" },
  { to: "/router", label: "Router Monitor", icon: Wifi, roles: ["admin", "technician"], group: "Network" },
  { to: "/wireguard", label: "WireGuard", icon: ShieldCheck, roles: ["admin", "technician"], group: "Network" },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "cashier"], group: "Insights" },
  { to: "/users", label: "Users", icon: Users, roles: ["admin"], group: "Administration" },
  { to: "/audit-logs", label: "Audit Logs", icon: ScrollText, roles: ["admin"], group: "Administration" },
  { to: "/login-pages", label: "Login Pages", icon: Palette, roles: ["admin"], group: "Administration" },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin"], group: "Administration" },
  { to: "/diagnostics", label: "Diagnostics", icon: Bug, roles: ["admin"], group: "Administration" },
];

export const NAV_GROUPS: NavItem["group"][] = [
  "Operations",
  "Network",
  "Insights",
  "Administration",
];
