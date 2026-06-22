/**
 * Server-only authentication helpers for raw HTTP route handlers under
 * `src/routes/api/mikrotik/*`. These routes are NOT under `/api/public/`, but
 * TanStack server routes have no built-in auth, so every handler MUST validate
 * the caller's Supabase bearer token (and role) before touching the router.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AppRole = "admin" | "cashier" | "technician";

export interface ApiAuth {
  userId: string;
  supabase: SupabaseClient<Database>;
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Validate the request's `Authorization: Bearer <token>` against Supabase Auth. */
export async function authenticateApiRequest(
  request: Request,
): Promise<{ auth: ApiAuth } | { error: Response }> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return { error: errorResponse("Server authentication is not configured.", 500) };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: errorResponse("Unauthorized", 401) };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { error: errorResponse("Unauthorized", 401) };
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return { error: errorResponse("Unauthorized", 401) };
  }

  return { auth: { userId: data.claims.sub as string, supabase } };
}

/**
 * Validate the token AND require the caller to hold at least one of the given
 * roles. Role membership is checked server-side via the `has_role` RPC.
 */
export async function requireApiRoles(
  request: Request,
  roles: AppRole[],
): Promise<{ auth: ApiAuth } | { error: Response }> {
  const result = await authenticateApiRequest(request);
  if ("error" in result) return result;

  const { auth } = result;
  const checks = await Promise.all(
    roles.map((role) => auth.supabase.rpc("has_role", { _user_id: auth.userId, _role: role })),
  );
  const allowed = checks.some(({ data }) => data === true);
  if (!allowed) {
    return { error: errorResponse("You do not have permission to perform this action.", 403) };
  }
  return { auth };
}
