import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mikrotik/online-devices")({
  server: {
    handlers: {
      GET: async () => {
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
