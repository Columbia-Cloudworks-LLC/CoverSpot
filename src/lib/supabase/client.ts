import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Returns the current session's access token, forcing the browser client
 * to finish loading the session from cookies before returning. Without
 * this, `functions.invoke` can race ahead of session initialisation and
 * send the anon key instead of the user JWT — which the edge function
 * gateway accepts (valid JWT) but `verifyUserAuth` rejects (no `sub`).
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
