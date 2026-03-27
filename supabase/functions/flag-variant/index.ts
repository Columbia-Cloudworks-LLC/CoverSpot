import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient, verifyUserAuth } from "../_shared/supabase-admin.ts";
import { loadConfig, resetConfigCache } from "../_shared/config.ts";

interface FlagRequest {
  variant_id: string;
  reason: string;
}

const VALID_REASONS = [
  "Not a real cover",
  "Wrong song",
  "Spam/inappropriate",
  "Duplicate",
  "Other",
];

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  resetConfigCache();

  try {
    const userId = await verifyUserAuth(req);
    if (!userId) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const body: FlagRequest = await req.json();
    const { variant_id, reason } = body;

    if (!variant_id || !reason) {
      return respond({ error: "variant_id and reason are required" }, 400);
    }

    if (!VALID_REASONS.includes(reason)) {
      return respond({ error: `Invalid reason. Must be one of: ${VALID_REASONS.join(", ")}` }, 400);
    }

    const admin = createAdminClient();
    const config = await loadConfig();

    // Rate-limit: count flags by this user in the last hour
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count, error: countError } = await admin
      .from("variant_flags")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);

    if (countError) {
      console.error("Rate limit check failed:", countError);
      return respond({ error: "Internal server error" }, 500);
    }

    if ((count ?? 0) >= config.rateLimitPerHour) {
      return respond(
        { error: "Rate limit exceeded. Please wait before flagging more variants." },
        429
      );
    }

    // Verify the variant exists
    const { data: variant, error: variantError } = await admin
      .from("track_variants")
      .select("id")
      .eq("id", variant_id)
      .single();

    if (variantError || !variant) {
      return respond({ error: "Variant not found" }, 404);
    }

    // Insert flag (unique constraint prevents double-flagging)
    const { error: insertError } = await admin
      .from("variant_flags")
      .insert({ variant_id, user_id: userId, reason });

    if (insertError) {
      if (insertError.code === "23505") {
        return respond({ error: "You have already flagged this variant" }, 409);
      }
      console.error("Flag insert failed:", insertError);
      return respond({ error: "Failed to submit flag" }, 500);
    }

    const { data: incRows, error: incError } = await admin.rpc(
      "increment_track_variant_flag_count",
      {
        p_variant_id: variant_id,
        p_flag_threshold: config.flagThreshold,
      }
    );

    if (incError || !incRows?.length) {
      console.error("Flag count increment failed:", incError);
      return respond({ error: "Failed to update flag count" }, 500);
    }

    const row = incRows[0] as { new_flag_count: number; new_status: string };

    return respond({
      flagged: true,
      flag_count: row.new_flag_count,
      status: row.new_status,
    });
  } catch (err) {
    console.error("flag-variant error:", err);
    return respond({ error: "Internal server error" }, 500);
  }
});

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
