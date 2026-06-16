import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Radio, RefreshCw, Search, Power, Loader2, Wifi } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { createRouterCommand } from "@/lib/router.functions";
import { formatBytes, formatUptimeSeconds, timeAgo } from "@/lib/router-utils";
import type { Tables } from "@/integrations/supabase/types";
import { PageHeader, RoleGuard } from "@/components/layout/PageParts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/sessions")({
  head: () => ({ meta: [{ title: "Active Sessions — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin", "cashier", "technician"]}>
      <SessionsPage />
    </RoleGuard>
  ),
});

type Session = Tables<"hotspot_sessions">;

function SessionsPage() {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["admin", "technician"]);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["hotspot-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotspot_sessions")
        .select("*")
        .eq("is_active", true)
        .order("login_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Session[];
    },
    refetchInterval: 15000,
  });

  const createCommand = useServerFn(createRouterCommand);
  const disconnect = useMutation({
    mutationFn: (s: Session) =>
      createCommand({
        data: {
          type: "disconnect_session",
          payload: { session_key: s.session_key, username: s.username ?? "" },
        },
      }),
    onSuccess: () => {
      toast.success("Disconnect queued. The connector will action it shortly.");
      queryClient.invalidateQueries({ queryKey: ["router-commands"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to queue disconnect."),
  });

  const filtered = (sessions ?? []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.username ?? "").toLowerCase().includes(q) ||
      (s.ip_address ?? "").toLowerCase().includes(q) ||
      (s.mac_address ?? "").toLowerCase().includes(q)
    );
  });

  const lastSync = (sessions ?? [])
    .map((s) => s.last_synced_at)
    .sort()
    .at(-1);

  return (
    <>
      <PageHeader
        title="Active Sessions"
        description="Live hotspot sessions synced from the RB951 via the VPS connector."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["hotspot-sessions"] })}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            {filtered.length} online
          </Badge>
          <span className="text-xs text-muted-foreground">Last sync {timeAgo(lastSync)}</span>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search user, IP or MAC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Wifi className="h-6 w-6" />
              </div>
              <p className="font-medium">No active sessions</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Connected users will appear here once the connector starts syncing the hotspot.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>IP address</TableHead>
                  <TableHead>MAC</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Data (down / up)</TableHead>
                  {canManage && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.username ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{s.ip_address ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {s.mac_address ?? "—"}
                    </TableCell>
                    <TableCell>{formatUptimeSeconds(s.uptime_seconds)}</TableCell>
                    <TableCell className="text-sm">
                      {formatBytes(s.bytes_in)} / {formatBytes(s.bytes_out)}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={disconnect.isPending}
                          onClick={() => disconnect.mutate(s)}
                        >
                          {disconnect.isPending && disconnect.variables?.id === s.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                          Disconnect
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
