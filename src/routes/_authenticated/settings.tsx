import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, KeyRound, Copy, RefreshCw, Terminal, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateRouterSettings, regenerateConnectorToken } from "@/lib/router.functions";
import type { Tables } from "@/integrations/supabase/types";
import { PageHeader, RoleGuard } from "@/components/layout/PageParts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <SettingsPage />
    </RoleGuard>
  ),
});

type Settings = Tables<"router_settings">;

interface FormState {
  name: string;
  host: string;
  api_port: number;
  api_use_tls: boolean;
  identity: string;
  wireguard_endpoint: string;
  wireguard_peer_public_key: string;
  notes: string;
}

const EMPTY: FormState = {
  name: "KIITEC RB951",
  host: "",
  api_port: 8728,
  api_use_tls: false,
  identity: "",
  wireguard_endpoint: "",
  wireguard_peer_public_key: "",
  notes: "",
};

function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncUrl, setSyncUrl] = useState("/api/public/connector/sync");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSyncUrl(`${window.location.origin}/api/public/connector/sync`);
    }
  }, []);

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
  });

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name ?? "KIITEC RB951",
        host: settings.host ?? "",
        api_port: settings.api_port ?? 8728,
        api_use_tls: settings.api_use_tls ?? false,
        identity: settings.identity ?? "",
        wireguard_endpoint: settings.wireguard_endpoint ?? "",
        wireguard_peer_public_key: settings.wireguard_peer_public_key ?? "",
        notes: settings.notes ?? "",
      });
    }
  }, [settings]);

  const saveFn = useServerFn(updateRouterSettings);
  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      toast.success("Router settings saved.");
      queryClient.invalidateQueries({ queryKey: ["router-settings"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to save settings."),
  });

  const tokenFn = useServerFn(regenerateConnectorToken);
  const regenerate = useMutation({
    mutationFn: () => tokenFn(),
    onSuccess: (res: { token: string; hint: string }) => {
      setNewToken(res.token);
      toast.success("New connector token generated.");
      queryClient.invalidateQueries({ queryKey: ["router-settings"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to generate token."),
  });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy.");
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <PageHeader
        title="Settings"
        description="MikroTik connection and the secure connector for your VPS agent."
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">MikroTik RB951</CardTitle>
            <CardDescription>
              How the VPS connector reaches RouterOS over the WireGuard tunnel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Display name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="API host (tunnel IP)">
                  <Input
                    placeholder="10.10.0.1"
                    value={form.host}
                    onChange={(e) => set("host", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="API port">
                <Input
                  type="number"
                  value={form.api_port}
                  onChange={(e) => set("api_port", Number(e.target.value) || 8728)}
                />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Use TLS (api-ssl)</p>
                <p className="text-xs text-muted-foreground">Enable for encrypted API on 8729.</p>
              </div>
              <Switch
                checked={form.api_use_tls}
                onCheckedChange={(v) => set("api_use_tls", v)}
              />
            </div>
            <Field label="Router identity">
              <Input
                placeholder="KIITEC-Hotspot"
                value={form.identity}
                onChange={(e) => set("identity", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">WireGuard</CardTitle>
            <CardDescription>Tunnel details shown on the WireGuard page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="VPS endpoint">
              <Input
                placeholder="vpn.kiitec.ac.tz:51820"
                value={form.wireguard_endpoint}
                onChange={(e) => set("wireguard_endpoint", e.target.value)}
              />
            </Field>
            <Field label="RB951 peer public key">
              <Input
                placeholder="base64 public key"
                className="font-mono text-xs"
                value={form.wireguard_peer_public_key}
                onChange={(e) => set("wireguard_peer_public_key", e.target.value)}
              />
            </Field>
            <Field label="Notes">
              <Textarea
                rows={4}
                placeholder="Deployment notes, contacts, maintenance windows…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <KeyRound className="h-4 w-4" />
            Connector token
          </CardTitle>
          <CardDescription>
            The VPS agent authenticates to this dashboard with a secret token. Only the hash is
            stored — copy the token when you generate it, it is shown once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {settings?.connector_token_hint ? (
              <Badge variant="secondary" className="font-mono">
                token ends in …{settings.connector_token_hint}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                No token generated yet
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending}
            >
              {regenerate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {settings?.connector_token_hint ? "Regenerate token" : "Generate token"}
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Terminal className="h-4 w-4" />
              Connector setup (run on your Ubuntu VPS)
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              The agent posts to this endpoint on an interval. Configure it with the token above.
            </p>
            <CodeLine text={syncUrl} onCopy={copy} copied={copied} />
            <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 text-xs leading-relaxed text-muted-foreground">
{`# environment for the connector service
KIITEC_SYNC_URL=${syncUrl}
KIITEC_CONNECTOR_TOKEN=<paste the generated token>
MIKROTIK_HOST=${form.host || "10.10.0.1"}
MIKROTIK_PORT=${form.api_port}
MIKROTIK_USER=<routeros api user>
MIKROTIK_PASSWORD=<routeros api password>`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!newToken} onOpenChange={(o) => !o && setNewToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new connector token</DialogTitle>
            <DialogDescription>
              Copy it now and store it on your VPS. For security it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <code className="block break-all font-mono text-sm">{newToken}</code>
          </div>
          <Button onClick={() => newToken && copy(newToken)}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy token
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CodeLine({
  text,
  onCopy,
  copied,
}: {
  text: string;
  onCopy: (t: string) => void;
  copied: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-background p-2">
      <code className="flex-1 break-all font-mono text-xs">{text}</code>
      <Button variant="ghost" size="sm" onClick={() => onCopy(text)}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
