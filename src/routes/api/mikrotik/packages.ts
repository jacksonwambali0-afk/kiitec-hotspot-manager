import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireApiRoles } from "@/lib/api-auth.server";

const createPackageSchema = z.object({
  name: z.string().min(1).max(100),
  sessionTime: z.string().optional(),
  rateLimit: z.string().optional(),
  sharedUsers: z.number().optional(),
});

const updatePackageSchema = createPackageSchema.extend({
  id: z.string().min(1).optional(),
  profileName: z.string().min(1).optional(),
}).refine((data) => data.id || data.profileName, {
  message: "Package id or profileName is required",
});

const deletePackageSchema = z.object({
  id: z.string().min(1).optional(),
  profileName: z.string().min(1).optional(),
}).refine((data) => data.id || data.profileName, {
  message: "Package id or profileName is required",
});

export const Route = createFileRoute("/api/mikrotik/packages")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authResult = await requireApiRoles(request, ["admin", "cashier", "technician"]);
        if ("error" in authResult) return authResult.error;
        try {
          const { getPackages } = await import("@/lib/mikrotik-api.server");
          const packages = await getPackages();
          return new Response(JSON.stringify({ packages }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
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

      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = createPackageSchema.safeParse(body);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { createPackage } = await import("@/lib/mikrotik-api.server");
          const result = await createPackage(parsed.data);
          return new Response(JSON.stringify({ success: true, id: result }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },

      PATCH: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = updatePackageSchema.safeParse(body);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { updatePackage } = await import("@/lib/mikrotik-api.server");
          const { id, profileName, ...updates } = parsed.data;
          await updatePackage({ id, name: profileName }, updates);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },

      DELETE: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = deletePackageSchema.safeParse(body);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { deletePackage } = await import("@/lib/mikrotik-api.server");
          await deletePackage({ id: parsed.data.id });
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
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
