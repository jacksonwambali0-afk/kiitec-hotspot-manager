// Server-only helpers for the MikroTik connector.
// The .server.ts suffix keeps this out of client bundles. Import it ONLY via
// dynamic `await import(...)` inside server-function handlers and route handlers
// (route files / *.functions.ts are part of the client module graph).
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tables } from "@/integrations/supabase/types";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateConnectorToken(): { token: string; hash: string; hint: string } {
  const token = `kc_${randomBytes(24).toString("hex")}`;
  return { token, hash: hashToken(token), hint: token.slice(-6) };
}

/** Fetch the singleton router settings row (oldest = canonical). */
export async function getRouterSettingsRow(): Promise<Tables<"router_settings"> | null> {
  const { data } = await supabaseAdmin
    .from("router_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/**
 * Verify a connector token against the stored hash using a timing-safe compare.
 * Returns the settings row when valid, otherwise null.
 */
export async function verifyConnectorToken(
  supplied: string | null,
): Promise<Tables<"router_settings"> | null> {
  if (!supplied) return null;
  const settings = await getRouterSettingsRow();
  if (!settings?.connector_token_hash) return null;
  const a = Buffer.from(hashToken(supplied));
  const b = Buffer.from(settings.connector_token_hash);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return settings;
}
