import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("cleanup-variants");

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // This function should only be called by pg_cron or service-role
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader?.includes(serviceKey ?? "__none__")) {
      return respond({ error: "Forbidden" }, 403);
    }

    const admin = createAdminClient();
    const results: Record<string, number> = {};

    // 1. Purge stale rejected variants (>30 days old, 0 flags)
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 3_600_000
    ).toISOString();

    const { data: staleRejected, error: staleError } = await admin
      .from("track_variants")
      .delete()
      .eq("status", "rejected")
      .eq("flag_count", 0)
      .lt("discovered_at", thirtyDaysAgo)
      .select("id");

    if (staleError) {
      log.error("Stale variant cleanup failed", { error: String(staleError) });
    }
    results.stale_rejected_purged = staleRejected?.length ?? 0;

    // 2. Report dead-letter jobs from last 7 days
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 3_600_000
    ).toISOString();

    const { count: deadMutations } = await admin
      .from("mutation_jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_dead_letter", true)
      .gte("created_at", sevenDaysAgo);

    const { count: deadSyncs } = await admin
      .from("sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_dead_letter", true)
      .gte("created_at", sevenDaysAgo);

    results.dead_letter_mutations_7d = deadMutations ?? 0;
    results.dead_letter_syncs_7d = deadSyncs ?? 0;

    log.info("Cleanup complete", results);

    return respond({ cleaned: true, ...results });
  } catch (err) {
    log.error("cleanup-variants error", { error: String(err) });
    return respond({ error: "Internal server error" }, 500);
  }
});

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
