import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Users,
  ShieldCheck,
  ShieldX,
  RefreshCw,
  Power,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { createRouterCommand } from "@/lib/router.functions";
import {
  isRouterOnline,
  formatBytes,
  usedPercent,
  timeAgo,
} from "@/lib/router-utils";
import type { Tables } from "@/integrations/supabase/types";
import { PageHeader, RoleGuard } from "@/components/layout/PageParts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/router")({
  head: () => ({ meta: [{ title: "Router Monitor — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin", "technician"]}>
      <RouterMonitorPage />
    </RoleGuard>
  ),
});

type Settings = Tables<"router_settings">;
type Heartbeat = Tables<"router_heartbeats">;

function RouterMonitorPage() {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["admin", "technician"]);
  const queryClient = useQueryClient();
  const [rebootOpen, setRebootOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["router-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("router_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
    refetchInterval: 15000,
  });

  const { data: heartbeat, isLoading } = useQuery({
    queryKey: ["router-heartbeat-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("router_heartbeats")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Heartbeat | null;
    },
    refetchInterval: 15000,
  });

  const createCommand = useServerFn(createRouterCommand);
  const reboot = useMutation({
    mutationFn: () => createCommand({ data: { type: "reboot", payload: {} } }),
    onSuccess: () => {
      toast.success("Reboot queued. The connector will run it on next check-in.");
      setRebootOpen(false);
      queryClient.invalidateQueries({ queryKey: ["router-commands"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to queue reboot."),
  });

  const online = isRouterOnline(settings?.last_seen_at);
  const memPct = usedPercent(heartbeat?.free_memory_bytes, heartbeat?.total_memory_bytes);
  const hddPct = usedPercent(heartbeat?.free_hdd_bytes, heartbeat?.total_hdd_bytes);

  return (
    <>
      <PageHeader
        title="Router Monitor"
        description={`Health and status of ${settings?.name ?? "the MikroTik RB951"}.`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["router-heartbeat-latest"] });
                queryClient.invalidateQueries({ queryKey: ["router-settings"] });
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {canManage && (
              <AlertDialog open={rebootOpen} onOpenChange={setRebootOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={!online}>
                    <Power className="h-4 w-4" />
                    Reboot
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reboot the router?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This queues a reboot command. The connector on your VPS will execute it on its
                      next check-in, disconnecting all active users for ~1 minute.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        reboot.mutate();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {reboot.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Queue reboot
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        }
      />

      <Card className="mb-6 shadow-card">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                online ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {online ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
            </span>
            <div>
              <p className="font-display text-lg font-semibold">
                {online ? "Online" : "Offline"}
              </p>
              <p className="text-sm text-muted-foreground">
                Last check-in {timeAgo(settings?.last_seen_at)}
                {heartbeat?.os_version ? ` · RouterOS ${heartbeat.os_version}` : ""}
              </p>
            </div>
          </div>
          {!settings?.connector_token_hash && (
            <Badge variant="outline" className="text-muted-foreground">
              Connector not configured — set it up in Settings
            </Badge>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Cpu}
            label="CPU load"
            value={heartbeat?.cpu_load != null ? `${heartbeat.cpu_load}%` : "—"}
            progress={heartbeat?.cpu_load ?? null}
            accent="brand"
          />
          <MetricCard
            icon={MemoryStick}
            label="Memory used"
            value={
              memPct != null
                ? `${memPct}%`
                : "—"
            }
            sub={
              heartbeat?.total_memory_bytes
                ? `${formatBytes(
                    (heartbeat.total_memory_bytes ?? 0) - (heartbeat.free_memory_bytes ?? 0),
                  )} / ${formatBytes(heartbeat.total_memory_bytes)}`
                : undefined
            }
            progress={memPct}
            accent="gold"
          />
          <MetricCard
            icon={HardDrive}
            label="Disk used"
            value={hddPct != null ? `${hddPct}%` : "—"}
            sub={
              heartbeat?.total_hdd_bytes
                ? `${formatBytes(
                    (heartbeat.total_hdd_bytes ?? 0) - (heartbeat.free_hdd_bytes ?? 0),
                  )} / ${formatBytes(heartbeat.total_hdd_bytes)}`
                : undefined
            }
            progress={hddPct}
            accent="muted"
          />
          <MetricCard
            icon={Users}
            label="Active hotspot users"
            value={
              heartbeat?.hotspot_active_users != null
                ? String(heartbeat.hotspot_active_users)
                : "—"
            }
            accent="success"
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Device</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Board" value={heartbeat?.board_name ?? "—"} />
            <InfoRow label="RouterOS" value={heartbeat?.os_version ?? "—"} />
            <InfoRow label="Uptime" value={heartbeat?.uptime ?? "—"} />
            <InfoRow label="Identity" value={settings?.identity ?? "—"} />
            <InfoRow label="API host" value={settings?.host ?? "—"} />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Tunnel &amp; services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-foreground">WireGuard tunnel</span>
              {heartbeat?.wireguard_connected ? (
                <Badge className="bg-success/15 text-success">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  <ShieldX className="mr-1 h-3.5 w-3.5" />
                  Down
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-foreground">Connector check-in</span>
              <span className="text-muted-foreground">
                <Clock className="mr-1 inline h-3.5 w-3.5" />
                {timeAgo(settings?.last_seen_at)}
              </span>
            </div>
            <InfoRow label="WireGuard endpoint" value={settings?.wireguard_endpoint ?? "—"} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

const ACCENTS: Record<string, string> = {
  brand: "bg-primary/10 text-primary",
  gold: "bg-accent text-accent-foreground",
  success: "bg-success/15 text-success",
  muted: "bg-muted text-muted-foreground",
};

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  progress,
  accent,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  sub?: string;
  progress?: number | null;
  accent: keyof typeof ACCENTS;
}) {
  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${ACCENTS[accent]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl font-bold">{value}</p>
        {typeof progress === "number" && (
          <Progress value={progress} className="mt-2 h-1.5" />
        )}
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
