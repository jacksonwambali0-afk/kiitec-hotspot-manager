import { createFileRoute } from "@tanstack/react-router";
import {
  DollarSign,
  CalendarDays,
  CalendarRange,
  Users,
  Ticket,
  Wifi,
  TimerReset,
  PackageX,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS } from "@/lib/nav";
import { PageHeader } from "@/components/layout/PageParts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — KIITEC Hotspot Management" }] }),
  component: DashboardPage,
});

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: "brand" | "gold" | "success" | "muted";
}

const STATS: Stat[] = [
  { label: "Today's Sales", value: "—", icon: DollarSign, accent: "gold" },
  { label: "Weekly Sales", value: "—", icon: CalendarDays, accent: "brand" },
  { label: "Monthly Sales", value: "—", icon: CalendarRange, accent: "brand" },
  { label: "Active Users", value: "—", icon: Users, accent: "success" },
  { label: "Online Devices", value: "—", icon: Wifi, accent: "success" },
  { label: "Unused Vouchers", value: "—", icon: Ticket, accent: "muted" },
  { label: "Expired Vouchers", value: "—", icon: TimerReset, accent: "muted" },
  { label: "Vouchers Sold", value: "—", icon: PackageX, accent: "muted" },
];

const ACCENT_CLASSES: Record<Stat["accent"], string> = {
  brand: "bg-primary/10 text-primary",
  gold: "bg-accent text-accent-foreground",
  success: "bg-success/10 text-success",
  muted: "bg-muted text-muted-foreground",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const { profile, user, roles } = useAuth();
  const name = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${name}`}
        description="Overview of the KIITEC hotspot. Live metrics activate as modules are connected."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <Badge key={r} variant="secondary" className="capitalize">
                {ROLE_LABELS[r]}
              </Badge>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${ACCENT_CLASSES[stat.accent]}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl font-bold">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">Awaiting data</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Revenue overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              Revenue charts appear here once the voucher &amp; sales module is connected.
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display">System status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusRow label="MikroTik RB951" state="Pending" />
            <StatusRow label="WireGuard tunnel" state="Pending" />
            <StatusRow label="User Manager" state="Pending" />
            <StatusRow label="Hotspot service" state="Pending" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatusRow({ label, state }: { label: string; state: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-foreground">{label}</span>
      <Badge variant="outline" className="text-muted-foreground">
        {state}
      </Badge>
    </div>
  );
}
