import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const createVoucherSchema = z.object({
  name: z.string().min(1).max(100),
  password: z.string().min(1).max(100),
  profile: z.string().min(1).max(100),
  comment: z.string().optional(),
});

const updateVoucherSchema = z.object({
  id: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  disabled: z.boolean().optional(),
  profile: z.string().optional(),
  comment: z.string().optional(),
}).refine((data) => data.id || data.username, {
  message: "Voucher id or username is required",
});

const deleteVoucherSchema = z.object({
  id: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
}).refine((data) => data.id || data.username, {
  message: "Voucher id or username is required",
});

export const Route = createFileRoute("/api/mikrotik/vouchers")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getVouchers } = await import("@/lib/mikrotik-api.server");
          const vouchers = await getVouchers();
          return new Response(JSON.stringify({ vouchers }), {
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
          const parsed = createVoucherSchema.safeParse(body);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { createVoucher } = await import("@/lib/mikrotik-api.server");
          const result = await createVoucher(parsed.data);
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
          const parsed = updateVoucherSchema.safeParse(body);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { updateVoucher } = await import("@/lib/mikrotik-api.server");
          const { id, username, ...updates } = parsed.data;
          await updateVoucher({ id, name: username }, updates);
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
          const parsed = deleteVoucherSchema.safeParse(body);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { deleteVoucher } = await import("@/lib/mikrotik-api.server");
          await deleteVoucher({ id: parsed.data.id, name: parsed.data.username });
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
