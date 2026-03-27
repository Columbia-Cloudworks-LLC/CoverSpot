import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Service-role only
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader?.includes(serviceKey ?? "__none__")) {
      return respond({ error: "Forbidden" }, 403);
    }

    const admin = createAdminClient();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 3_600_000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3_600_000).toISOString();

    // Mutation jobs by status (24h)
    const { data: mutationStats24h } = await admin.rpc("exec_sql", {
      query: `
        SELECT status, is_dead_letter, count(*)::int as count,
               avg(extract(epoch from (completed_at - created_at)))::numeric(10,2) as avg_duration_sec
        FROM mutation_jobs
        WHERE created_at >= '${oneDayAgo}'
        GROUP BY status, is_dead_letter
      `,
    }).catch(() => ({ data: null }));

    // Mutation jobs by status (7d)
    const { data: mutationStats7d } = await admin.rpc("exec_sql", {
      query: `
        SELECT status, is_dead_letter, count(*)::int as count
        FROM mutation_jobs
        WHERE created_at >= '${sevenDaysAgo}'
        GROUP BY status, is_dead_letter
      `,
    }).catch(() => ({ data: null }));

    // Sync jobs by status (24h)
    const { data: syncStats24h } = await admin.rpc("exec_sql", {
      query: `
        SELECT status, is_dead_letter, count(*)::int as count,
               avg(extract(epoch from (completed_at - started_at)))::numeric(10,2) as avg_duration_sec
        FROM sync_jobs
        WHERE started_at >= '${oneDayAgo}'
        GROUP BY status, is_dead_letter
      `,
    }).catch(() => ({ data: null }));

    // Dead-letter counts
    const { count: deadMutations } = await admin
      .from("mutation_jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_dead_letter", true);

    const { count: deadSyncs } = await admin
      .from("sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_dead_letter", true);

    // Variant stats
    const { count: totalVariants } = await admin
      .from("track_variants")
      .select("id", { count: "exact", head: true });

    const { count: activeVariants } = await admin
      .from("track_variants")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    const { count: reviewVariants } = await admin
      .from("track_variants")
      .select("id", { count: "exact", head: true })
      .eq("status", "review");

    const { count: rejectedVariants } = await admin
      .from("track_variants")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected");

    // Pending flags
    const { count: totalFlags } = await admin
      .from("variant_flags")
      .select("id", { count: "exact", head: true });

    return respond({
      timestamp: now.toISOString(),
      jobs: {
        mutations: {
          last_24h: mutationStats24h,
          last_7d: mutationStats7d,
          dead_letter_total: deadMutations ?? 0,
        },
        syncs: {
          last_24h: syncStats24h,
          dead_letter_total: deadSyncs ?? 0,
        },
      },
      variants: {
        total: totalVariants ?? 0,
        active: activeVariants ?? 0,
        review: reviewVariants ?? 0,
        rejected: rejectedVariants ?? 0,
      },
      moderation: {
        total_flags: totalFlags ?? 0,
      },
    });
  } catch (err) {
    console.error("admin-health error:", err);
    return respond({ error: "Internal server error" }, 500);
  }
});

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
