import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient, getUserIdFromAuth } from "../_shared/supabase-admin.ts";
import { refreshSpotifyToken } from "../_shared/spotify.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = getUserIdFromAuth(req);
    let targetUserId = userId;

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.user_id) targetUserId = body.user_id;
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createAdminClient();

    const { data: user, error: userError } = await admin
      .from("users")
      .select("spotify_refresh_token, token_expires_at, spotify_access_token")
      .eq("id", targetUserId)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiresAt = new Date(user.token_expires_at).getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresAt - Date.now() > fiveMinutes) {
      return new Response(
        JSON.stringify({
          access_token: user.spotify_access_token,
          refreshed: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await refreshSpotifyToken(user.spotify_refresh_token);

    if (!tokenData) {
      await admin
        .from("users")
        .update({ spotify_access_token: "", spotify_refresh_token: "" })
        .eq("id", targetUserId);

      return new Response(
        JSON.stringify({ error: "Token refresh failed. Re-authentication required.", needsReauth: true }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await admin
      .from("users")
      .update({
        spotify_access_token: tokenData.access_token,
        spotify_refresh_token: tokenData.refresh_token ?? user.spotify_refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      })
      .eq("id", targetUserId);

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refreshed: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("refresh-spotify-token error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
