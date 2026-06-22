import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS } from "@/lib/nav";
import { TZS } from "@/lib/voucher-utils";
import { authedFetch } from "@/lib/authed-fetch";
import { PageHeader, RoleGuard } from "@/components/layout/PageParts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin", "cashier", "technician"]}>
      <DashboardPage />
    </RoleGuard>
  ),
});

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: "brand" | "gold" | "success" | "muted";
}

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
  const [error, setError] = useState<string | null>(null);

  // Fetch MikroTik stats (active users, online devices)
  const { data: routerStats, isLoading: statsLoading } = useQuery({
    queryKey: ["mikrotik-stats"],
    queryFn: async () => {
      const res = await authedFetch("/api/mikrotik/stats");
      if (!res.ok) throw new Error("Failed to fetch router stats");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: false,
  });

  // Fetch online device count
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ["mikrotik-devices"],
    queryFn: async () => {
      const res = await authedFetch("/api/mikrotik/online-devices");
      if (!res.ok) throw new Error("Failed to fetch online devices");
      return res.json();
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  // Fetch voucher stats from Supabase
  const { data: voucherStats, isLoading: vouchersLoading } = useQuery({
    queryKey: ["dashboard-voucher-stats"],
    queryFn: async () => {
      const statuses = ["unused", "sold", "expired"] as const;
      const counts = await Promise.all(
        statuses.map(async (status) => {
          const { count, error: err } = await supabase
            .from("vouchers")
            .select("*", { count: "exact", head: true })
            .eq("status", status);
          if (err) throw err;
          return [status, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(counts);
    },
    refetchInterval: 60000, // Refresh every 60 seconds
    refetchOnWindowFocus: false,
  });

  // Fetch sales stats from Supabase
  const { data: salesStats, isLoading: salesLoading } = useQuery({
    queryKey: ["dashboard-sales-stats"],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      // Today's sales
      const { data: todayData, error: todayErr } = await supabase
        .from("vouchers")
        .select("price")
        .eq("status", "sold")
        .gte("sold_at", today.toISOString());
      if (todayErr) throw todayErr;
      const todaySales = (todayData || []).reduce((sum, v) => sum + (v.price || 0), 0);

      // Weekly sales (last 7 days)
      const { data: weekData, error: weekErr } = await supabase
        .from("vouchers")
        .select("price")
        .eq("status", "sold")
        .gte("sold_at", weekAgo.toISOString());
      if (weekErr) throw weekErr;
      const weeklySales = (weekData || []).reduce((sum, v) => sum + (v.price || 0), 0);

      // Monthly sales (last 30 days)
      const { data: monthData, error: monthErr } = await supabase
        .from("vouchers")
        .select("price")
        .eq("status", "sold")
        .gte("sold_at", monthAgo.toISOString());
      if (monthErr) throw monthErr;
      const monthlySales = (monthData || []).reduce((sum, v) => sum + (v.price || 0), 0);

      return { todaySales, weeklySales, monthlySales };
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    refetchOnWindowFocus: false,
  });

  // Build dynamic stats
  const stats: Stat[] = [
    {
      label: "Today's Sales",
      value: salesLoading ? "..." : TZS(salesStats?.todaySales || 0),
      icon: DollarSign,
      accent: "gold",
    },
    {
      label: "Weekly Sales",
      value: salesLoading ? "..." : TZS(salesStats?.weeklySales || 0),
      icon: CalendarDays,
      accent: "brand",
    },
    {
      label: "Monthly Sales",
      value: salesLoading ? "..." : TZS(salesStats?.monthlySales || 0),
      icon: CalendarRange,
      accent: "brand",
    },
    {
      label: "Active Users",
      value: statsLoading ? "..." : `${routerStats?.activeUsers || 0}`,
      icon: Users,
      accent: "success",
    },
    {
      label: "Online Devices",
      value: devicesLoading ? "..." : `${devicesData?.count || 0}`,
      icon: Wifi,
      accent: "success",
    },
    {
      label: "Unused Vouchers",
      value: vouchersLoading ? "..." : `${voucherStats?.unused || 0}`,
      icon: Ticket,
      accent: "muted",
    },
    {
      label: "Expired Vouchers",
      value: vouchersLoading ? "..." : `${voucherStats?.expired || 0}`,
      icon: TimerReset,
      accent: "muted",
    },
    {
      label: "Vouchers Sold",
      value: vouchersLoading ? "..." : `${voucherStats?.sold || 0}`,
      icon: PackageX,
      accent: "muted",
    },
  ];

  // Recently activated vouchers (last 24 hours)
  const { data: recentActivations = [], isLoading: recentLoading } = useQuery({
    queryKey: ["dashboard-recent-activations"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("vouchers")
        .select("id, username, activated_at, package_id, price, buyer_name")
        .gte("activated_at", since)
        .order("activated_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  // Upcoming expiries (next 7 days)
  const { data: upcomingExpiries = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ["dashboard-upcoming-expiries"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("vouchers")
        .select("id, username, expires_at, package_id, price, buyer_name, status")
        .gte("expires_at", now)
        .lte("expires_at", until)
        .order("expires_at", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 300000,
    refetchOnWindowFocus: false,
  });

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${name}`}
        description="Live metrics from MikroTik router and hotspot system."
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

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isLoading =
            stat.label === "Active Users" && statsLoading
              ? true
              : stat.label === "Online Devices" && devicesLoading
                ? true
                : stat.label.includes("Voucher") && vouchersLoading
                  ? true
                  : false;
          return (
            <Card key={stat.label} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${ACCENT_CLASSES[stat.accent]}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl font-bold">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isLoading ? "Loading..." : stat.label.includes("Voucher") ? "From Supabase" : "Live"}
                </p>
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
            <StatusRow
              label="MikroTik RB951"
              state={statsLoading ? "Connecting..." : routerStats?.name ? "Online" : "Offline"}
            />
            <StatusRow label="WireGuard tunnel" state={statsLoading ? "Checking..." : "Connected"} />
            <StatusRow label="Active Sessions" state={`${routerStats?.sessions?.length || 0} users`} />
            <StatusRow label="Last Update" state="Live" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-display">Recently activated (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : recentActivations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activations</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentActivations.map((r: any) => (
                  <li key={r.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.username}</div>
                      <div className="text-xs text-muted-foreground">{r.buyer_name || "—"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(r.activated_at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Upcoming expiries (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : upcomingExpiries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming expiries</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {upcomingExpiries.map((e: any) => (
                  <li key={e.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{e.username}</div>
                      <div className="text-xs text-muted-foreground">{e.buyer_name || "—"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(e.expires_at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
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
