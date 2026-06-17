import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Public endpoint for the VPS connector agent. Auth is via the X-Connector-Token
// header (verified against the stored hash), NOT user sessions — so it lives under
// /api/public/* which bypasses published-site auth. The agent polls this on an
// interval: it pushes a heartbeat + active sessions snapshot + command results,
// and receives any pending commands to execute on the RouterOS side.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Connector-Token",
  "Access-Control-Max-Age": "86400",
} as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const heartbeatSchema = z.object({
  board_name: z.string().max(120).nullish(),
  os_version: z.string().max(60).nullish(),
  uptime: z.string().max(60).nullish(),
  cpu_load: z.number().int().min(0).max(100).nullish(),
  free_memory_bytes: z.number().int().nonnegative().nullish(),
  total_memory_bytes: z.number().int().nonnegative().nullish(),
  free_hdd_bytes: z.number().int().nonnegative().nullish(),
  total_hdd_bytes: z.number().int().nonnegative().nullish(),
  hotspot_active_users: z.number().int().nonnegative().nullish(),
  wireguard_connected: z.boolean().nullish(),
});

const sessionSchema = z.object({
  session_key: z.string().min(1).max(200).nullish(),
  username: z.string().max(120).nullish(),
  ip_address: z.string().max(64).nullish(),
  mac_address: z.string().max(64).nullish(),
  login_at: z.string().max(40).nullish(),
  uptime_seconds: z.number().int().nonnegative().nullish(),
  bytes_in: z.number().int().nonnegative().nullish(),
  bytes_out: z.number().int().nonnegative().nullish(),
});

const bodySchema = z.object({
  heartbeat: heartbeatSchema.nullish(),
  sessions: z.union([z.array(sessionSchema).max(2000), z.string()]).nullish(),
  command_results: z
    .array(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["done", "failed"]),
        result: z.string().max(2000).nullish(),
      }),
    )
    .max(200)
    .nullish(),
});

export const Route = createFileRoute("/api/public/connector/sync")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const token = request.headers.get("x-connector-token");
        const { verifyConnectorToken } = await import("@/lib/router.server");
        const settings = await verifyConnectorToken(token);
        if (!settings) return json({ error: "Unauthorized" }, 401);

        const raw = await request.json().catch(() => null);
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
        }
        const body = {
          ...parsed.data,
          sessions: Array.isArray(parsed.data.sessions) ? parsed.data.sessions : [],
        };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();

        // 1) Heartbeat + last-seen.
        if (body.heartbeat) {
          await supabaseAdmin.from("router_heartbeats").insert(body.heartbeat);
        }
        await supabaseAdmin
          .from("router_settings")
          .update({ last_seen_at: now })
          .eq("id", settings.id);

        // 2) Active sessions snapshot (upsert present, deactivate the rest).
        if (body.sessions) {
          const normalizedSessions = body.sessions
            .map((s) => ({
              ...s,
              session_key:
                s.session_key || [s.username, s.ip_address, s.mac_address].filter(Boolean).join("|"),
            }))
            .filter((s): s is typeof s & { session_key: string } => Boolean(s.session_key));
          const incomingKeys = new Set(normalizedSessions.map((s) => s.session_key));

          // Map usernames -> voucher ids so sessions link to their voucher.
          const usernames = Array.from(
            new Set(normalizedSessions.map((s) => s.username).filter(Boolean) as string[]),
          );
          const voucherMap = new Map<string, string>();
          if (usernames.length) {
            const { data: vouchers } = await supabaseAdmin
              .from("vouchers")
              .select("id, username")
              .in("username", usernames);
            for (const v of vouchers ?? []) {
              if (v.username) voucherMap.set(v.username, v.id);
            }
          }

          if (normalizedSessions.length) {
            const rows = normalizedSessions.map((s) => ({
              session_key: s.session_key,
              username: s.username ?? null,
              ip_address: s.ip_address ?? null,
              mac_address: s.mac_address ?? null,
              login_at: s.login_at ?? null,
              uptime_seconds: s.uptime_seconds ?? null,
              bytes_in: s.bytes_in ?? 0,
              bytes_out: s.bytes_out ?? 0,
              voucher_id: (s.username && voucherMap.get(s.username)) || null,
              is_active: true,
              last_synced_at: now,
            }));
            await supabaseAdmin
              .from("hotspot_sessions")
              .upsert(rows, { onConflict: "session_key" });
          }

          // Deactivate any previously-active sessions no longer present.
          const { data: activeRows } = await supabaseAdmin
            .from("hotspot_sessions")
            .select("id, session_key")
            .eq("is_active", true);
          const stale = (activeRows ?? [])
            .filter((r) => !incomingKeys.has(r.session_key))
            .map((r) => r.id);
          if (stale.length) {
            await supabaseAdmin
              .from("hotspot_sessions")
              .update({ is_active: false, last_synced_at: now })
              .in("id", stale);
          }
        }

        // 3) Command results from the agent.
        for (const cr of body.command_results ?? []) {
          await supabaseAdmin
            .from("router_commands")
            .update({ status: cr.status, result: cr.result ?? null, completed_at: now })
            .eq("id", cr.id);
        }

        // 4) Hand back pending commands and mark them as sent.
        const { data: pending } = await supabaseAdmin
          .from("router_commands")
          .select("id, type, payload, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(50);
        if (pending?.length) {
          await supabaseAdmin
            .from("router_commands")
            .update({ status: "sent" })
            .in(
              "id",
              pending.map((c) => c.id),
            );
        }

        return json({ ok: true, server_time: now, commands: pending ?? [] }, 200);
      },
    },
  },
});
