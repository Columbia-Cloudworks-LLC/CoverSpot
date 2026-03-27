import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient, verifyUserAuth } from "../_shared/supabase-admin.ts";

interface ModerateRequest {
  variant_id: string;
  action: "approve" | "reject" | "dismiss_flags";
  reason?: string;
}

const ACTION_TRANSITIONS: Record<string, { from: string[]; to: string }> = {
  approve: { from: ["review", "rejected"], to: "active" },
  reject: { from: ["active", "review"], to: "rejected" },
  dismiss_flags: { from: ["review", "active"], to: "active" },
};

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = await verifyUserAuth(req);
    if (!userId) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const admin = createAdminClient();

    // Verify moderator role
    const { data: moderator } = await admin
      .from("users")
      .select("is_moderator")
      .eq("id", userId)
      .single();

    if (!moderator?.is_moderator) {
      return respond({ error: "Forbidden: moderator role required" }, 403);
    }

    const body: ModerateRequest = await req.json();
    const { variant_id, action, reason } = body;

    if (!variant_id || !action) {
      return respond({ error: "variant_id and action are required" }, 400);
    }

    const transition = ACTION_TRANSITIONS[action];
    if (!transition) {
      return respond({ error: `Invalid action: ${action}` }, 400);
    }

    // Fetch current variant
    const { data: variant, error: fetchError } = await admin
      .from("track_variants")
      .select("id, status, flag_count")
      .eq("id", variant_id)
      .single();

    if (fetchError || !variant) {
      return respond({ error: "Variant not found" }, 404);
    }

    const currentStatus = variant.status as string;
    if (!transition.from.includes(currentStatus)) {
      return respond(
        {
          error: `Cannot ${action} a variant with status "${currentStatus}". Allowed source statuses: ${transition.from.join(", ")}`,
        },
        422
      );
    }

    // Apply the status change
    const updates: Record<string, unknown> = { status: transition.to };

    if (action === "reject") {
      updates.rejection_reason = reason ?? "Rejected by moderator";
    }

    if (action === "approve") {
      updates.rejection_reason = null;
    }

    if (action === "dismiss_flags") {
      updates.flag_count = 0;
    }

    await admin
      .from("track_variants")
      .update(updates)
      .eq("id", variant_id);

    // Delete associated flags on dismiss
    if (action === "dismiss_flags") {
      await admin
        .from("variant_flags")
        .delete()
        .eq("variant_id", variant_id);
    }

    // Write audit log entry
    await admin.from("moderation_audit_log").insert({
      variant_id,
      moderator_id: userId,
      action,
      previous_status: currentStatus,
      new_status: transition.to,
      reason: reason ?? null,
    });

    return respond({
      moderated: true,
      previous_status: currentStatus,
      new_status: transition.to,
    });
  } catch (err) {
    console.error("moderate-variant error:", err);
    return respond({ error: "Internal server error" }, 500);
  }
});

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
