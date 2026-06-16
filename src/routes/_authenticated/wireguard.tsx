import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldX, Lock, Server, KeyRound, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isRouterOnline, timeAgo } from "@/lib/router-utils";
import type { Tables } from "@/integrations/supabase/types";
import { PageHeader, RoleGuard } from "@/components/layout/PageParts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/wireguard")({
  head: () => ({ meta: [{ title: "WireGuard — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin", "technician"]}>
      <WireGuardPage />
    </RoleGuard>
  ),
});

type Settings = Tables<"router_settings">;
type Heartbeat = Tables<"router_heartbeats">;

function WireGuardPage() {
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

  const { data: heartbeat } = useQuery({
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

  const online = isRouterOnline(settings?.last_seen_at);
  const tunnelUp = online && !!heartbeat?.wireguard_connected;

  return (
    <>
      <PageHeader
        title="WireGuard"
        description="Secure tunnel between the VPS and the RB951."
      />

      <Card className="mb-6 shadow-card">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                tunnelUp ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {tunnelUp ? <ShieldCheck className="h-6 w-6" /> : <ShieldX className="h-6 w-6" />}
            </span>
            <div>
              <p className="font-display text-lg font-semibold">
                {tunnelUp ? "Tunnel connected" : "Tunnel down"}
              </p>
              <p className="text-sm text-muted-foreground">
                Reported {timeAgo(settings?.last_seen_at)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Auto-refreshing
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Tunnel configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ConfigRow
              icon={Server}
              label="VPS endpoint"
              value={settings?.wireguard_endpoint ?? "Not configured"}
            />
            <ConfigRow
              icon={KeyRound}
              label="RB951 peer public key"
              value={settings?.wireguard_peer_public_key ?? "Not configured"}
              mono
            />
            <ConfigRow
              icon={Lock}
              label="RouterOS API"
              value={
                settings?.host
                  ? `${settings.host}:${settings.api_port}${settings.api_use_tls ? " (TLS)" : ""}`
                  : "Not configured"
              }
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The tunnel is always initiated <strong className="text-foreground">from the RB951
              to the VPS</strong>, so the MikroTik API is never exposed to the public internet.
            </p>
            <p>
              The connector agent on your Ubuntu VPS talks to RouterOS across this tunnel, then
              reports status and session data to this dashboard. Configure the endpoint and keys in{" "}
              <strong className="text-foreground">Settings</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ConfigRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Server;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`break-all font-medium text-foreground ${mono ? "font-mono text-xs" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
