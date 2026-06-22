import { supabase } from "@/integrations/supabase/client";

/**
 * Browser fetch wrapper that attaches the current Supabase session bearer token
 * so protected server routes (e.g. `/api/mikrotik/*`) can authenticate the user.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}
