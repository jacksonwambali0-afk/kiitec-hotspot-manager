import { createFileRoute } from "@tanstack/react-router";
import { requireApiRoles } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/mikrotik/online-devices")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authResult = await requireApiRoles(request, ["admin", "cashier", "technician"]);
        if ("error" in authResult) return authResult.error;
        try {
          const { getOnlineDeviceCount } = await import("@/lib/mikrotik-api.server");
          const data = await getOnlineDeviceCount();
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
