import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Validates the JWT from the Authorization header server-side via
 * Supabase Auth and returns the authenticated user's ID.
 *
 * This replaces the old decode-only helper so we get real signature
 * verification even with gateway `verify_jwt` disabled.
 */
export async function verifyUserAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}
