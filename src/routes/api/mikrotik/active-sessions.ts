import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { requireApiRoles } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/mikrotik/active-sessions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authResult = await requireApiRoles(request, ["admin", "cashier", "technician"]);
        if ("error" in authResult) return authResult.error;
        try {
          const { getActiveSessions } = await import("@/lib/mikrotik-api.server");
          const data = await getActiveSessions();

          // For each active session username, record activation time (activated_at)
          // and compute expires_at based on the package's period_mode.
          try {
            const sessions = data.sessions || [];
            for (const s of sessions) {
              const username = s.username;
              if (!username) continue;

              // Find voucher by username
              const { data: vdata, error: vErr } = await supabase
                .from("vouchers")
                .select("id, activated_at, expires_at, status, package_id, price, sold_at")
                .eq("username", username)
                .maybeSingle();
              if (vErr || !vdata) continue;

              // If not yet activated, set activated_at, compute expires_at and mark active/sold
              if (!vdata.activated_at) {
                const now = new Date().toISOString();

                // Fetch package info (duration_minutes & period_mode)
                let durationMinutes = 1440;
                let periodMode: string | null = null;
                if (vdata.package_id) {
                  const { data: pkg, error: pkgErr } = await supabase
                    .from("packages")
                    .select("duration_minutes, period_mode")
                    .eq("id", vdata.package_id)
                    .maybeSingle();
                  if (!pkgErr && pkg) {
                    durationMinutes = pkg.duration_minutes ?? durationMinutes;
                    periodMode = pkg.period_mode ?? null;
                  }
                }

                // Compute expires_at
                const activatedAt = new Date(now);
                let expiresAt: Date;
                if (!periodMode || periodMode === "rolling") {
                  expiresAt = new Date(activatedAt.getTime() + (durationMinutes || 0) * 60_000);
                } else if (periodMode === "calendar_day") {
                  expiresAt = new Date(activatedAt);
                  expiresAt.setHours(23, 59, 59, 999);
                } else if (periodMode === "calendar_week") {
                  // End of week = Sunday 23:59:59.999
                  const day = activatedAt.getDay(); // 0(Sun)-6
                  const daysToSunday = (7 - day) % 7;
                  expiresAt = new Date(activatedAt);
                  expiresAt.setDate(activatedAt.getDate() + daysToSunday);
                  expiresAt.setHours(23, 59, 59, 999);
                } else if (periodMode === "calendar_month") {
                  expiresAt = new Date(activatedAt.getFullYear(), activatedAt.getMonth() + 1, 0, 23, 59, 59, 999);
                } else {
                  // Fallback to rolling
                  expiresAt = new Date(activatedAt.getTime() + (durationMinutes || 0) * 60_000);
                }

                // Update voucher: set activated_at, expires_at, status -> active
                const updates: any = { activated_at: now, expires_at: expiresAt.toISOString(), status: "active" };

                // If voucher was unused and never sold, mark sold_at so sales stats capture it
                if (!vdata.sold_at && vdata.status === "unused") {
                  updates.sold_at = now;
                }

                await supabase.from("vouchers").update(updates).eq("id", vdata.id);
              }
            }
          } catch (e) {
            console.error("Failed to persist activation data for active sessions:", e);
          }

          return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
