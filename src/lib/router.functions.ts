import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthedSupabase = Parameters<
  Parameters<ReturnType<typeof requireSupabaseAuth.server>["server"]>[0] extends never
    ? never
    : never
>;

/** Throw unless the caller is an admin or technician. */
async function assertRouterManager(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<void> {
  const [{ data: isAdmin }, { data: isTech }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "technician" }),
  ]);
  if (!isAdmin && !isTech) {
    throw new Error("You do not have permission to manage the router.");
  }
}

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  host: z.string().trim().max(255).optional().default(""),
  api_port: z.number().int().min(1).max(65535),
  api_use_tls: z.boolean(),
  identity: z.string().trim().max(120).optional().default(""),
  wireguard_endpoint: z.string().trim().max(255).optional().default(""),
  wireguard_peer_public_key: z.string().trim().max(255).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const updateRouterSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => settingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertRouterManager(supabase, userId);

    const payload = {
      name: data.name,
      host: data.host || null,
      api_port: data.api_port,
      api_use_tls: data.api_use_tls,
      identity: data.identity || null,
      wireguard_endpoint: data.wireguard_endpoint || null,
      wireguard_peer_public_key: data.wireguard_peer_public_key || null,
      notes: data.notes || null,
    };

    const { data: existing } = await supabase
      .from("router_settings")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("router_settings")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw error;
      return { id: existing.id as string };
    }

    const { data: ins, error } = await supabase
      .from("router_settings")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: ins.id as string };
  });

/** Generate a fresh connector token. Returns the plaintext ONCE; only the hash is stored. */
export const regenerateConnectorToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertRouterManager(supabase, userId);

    const { generateConnectorToken } = await import("@/lib/router.server");
    const { token, hash, hint } = generateConnectorToken();

    const { data: existing } = await supabase
      .from("router_settings")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("router_settings")
        .update({ connector_token_hash: hash, connector_token_hint: hint })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("router_settings")
        .insert({ connector_token_hash: hash, connector_token_hint: hint });
      if (error) throw error;
    }

    return { token, hint };
  });

const commandSchema = z.object({
  type: z.enum(["disconnect_session", "disable_user", "sync_voucher", "reboot", "custom"]),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
});

export const createRouterCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => commandSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertRouterManager(supabase, userId);

    const { data: cmd, error } = await supabase
      .from("router_commands")
      .insert({
        type: data.type,
        payload: data.payload as Record<string, unknown>,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: cmd.id as string };
  });
