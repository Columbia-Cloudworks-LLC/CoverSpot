import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient, verifyUserAuth } from "../_shared/supabase-admin.ts";
import { spotifyFetch, refreshSpotifyToken } from "../_shared/spotify.ts";
import { withRetry, isTransientError } from "../_shared/retry.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("mutate-playlist");

interface MutateRequest {
  playlist_id: string;
  spotify_playlist_id: string;
  variant_id: string;
  variant_platform_id: string;
  mutation_type: "add" | "swap";
  original_track_position: number;
  snapshot_id: string;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = await verifyUserAuth(req);
    if (!userId) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const body: MutateRequest = await req.json();
    const {
      playlist_id,
      spotify_playlist_id,
      variant_id,
      variant_platform_id,
      mutation_type,
      original_track_position,
      snapshot_id,
    } = body;

    if (!playlist_id || !variant_platform_id || !mutation_type) {
      return respond({ error: "Missing required fields" }, 400);
    }

    const admin = createAdminClient();

    const { data: user } = await admin
      .from("users")
      .select("spotify_access_token, spotify_refresh_token, token_expires_at")
      .eq("id", userId)
      .single();

    if (!user) {
      return respond({ error: "User not found" }, 404);
    }

    let accessToken = user.spotify_access_token;
    const expiresAt = new Date(user.token_expires_at).getTime();
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      const tokenData = await refreshSpotifyToken(user.spotify_refresh_token);
      if (!tokenData) {
        return respond({ error: "Token refresh failed", needsReauth: true }, 401);
      }
      accessToken = tokenData.access_token;
      await admin
        .from("users")
        .update({
          spotify_access_token: tokenData.access_token,
          spotify_refresh_token: tokenData.refresh_token ?? user.spotify_refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        })
        .eq("id", userId);
    }

    const { data: currentPlaylist } = await admin
      .from("spotify_playlists")
      .select("snapshot_id, spotify_playlist_id")
      .eq("id", playlist_id)
      .single();

    const jobRow = {
      user_id: userId,
      playlist_id,
      mutation_type,
      variant_id: variant_id || null,
      target_position: mutation_type === "swap" ? original_track_position : null,
      snapshot_id_before: snapshot_id,
      status: "pending" as const,
    };

    const { data: job } = await admin
      .from("mutation_jobs")
      .insert(jobRow)
      .select("id")
      .single();

    const jobId = job?.id;
    log.jobTransition("mutation", jobId ?? "unknown", "new", "pending");

    const trackUri = `spotify:track:${variant_platform_id}`;
    const playlistApiId = spotify_playlist_id || currentPlaylist?.spotify_playlist_id;

    if (!playlistApiId) {
      await updateJob(admin, jobId, "failed", "Playlist not found");
      return respond({ error: "Playlist not found" }, 404);
    }

    if (mutation_type === "add") {
      try {
        const result = await withRetry(
          async () => {
            const r = await spotifyFetch(
              `https://api.spotify.com/v1/playlists/${playlistApiId}/tracks`,
              accessToken,
              { method: "POST", body: JSON.stringify({ uris: [trackUri] }) }
            );
            if (r.error) {
              if (r.retryAfter) {
                log.httpError("spotify", 429, `Retry-After: ${r.retryAfter}s`);
                throw new Error(`Rate limited (429)`);
              }
              throw new Error(r.error);
            }
            return r;
          },
          (err) => isTransientError(err),
          { maxRetries: 3 }
        );

        const newSnapshot = (result.data as Record<string, string>)?.snapshot_id;
        await updateJob(admin, jobId, "success", null, newSnapshot);
        await updatePlaylistSnapshot(admin, playlist_id, newSnapshot);
        log.jobTransition("mutation", jobId ?? "unknown", "pending", "success");

        return respond({ status: "success", snapshot_id: newSnapshot });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await markDeadLetter(admin, jobId, msg);
        log.jobTransition("mutation", jobId ?? "unknown", "pending", "dead_letter", { error: msg });
        return respond({ error: msg, status: "failed" });
      }
    }

    if (mutation_type === "swap") {
      const { data: linkData } = await admin
        .from("playlist_tracks_link")
        .select("track_id")
        .eq("playlist_id", playlist_id)
        .eq("position", original_track_position)
        .single();

      if (!linkData) {
        await updateJob(admin, jobId, "failed", "Original track not found at position");
        return respond({ error: "Track not found at position", status: "failed" });
      }

      const { data: originalTrack } = await admin
        .from("spotify_tracks")
        .select("spotify_track_id")
        .eq("id", (linkData as Record<string, string>).track_id)
        .single();

      if (!originalTrack) {
        await updateJob(admin, jobId, "failed", "Original track data not found");
        return respond({ error: "Original track not found", status: "failed" });
      }

      const originalUri = `spotify:track:${(originalTrack as Record<string, string>).spotify_track_id}`;

      try {
        // Step 1: Remove original track (with retry)
        const removeResult = await withRetry(
          async () => {
            const r = await spotifyFetch(
              `https://api.spotify.com/v1/playlists/${playlistApiId}/tracks`,
              accessToken,
              {
                method: "DELETE",
                body: JSON.stringify({
                  tracks: [{ uri: originalUri, positions: [original_track_position] }],
                  snapshot_id: snapshot_id,
                }),
              }
            );
            if (r.error) {
              if (r.error.includes("snapshot")) {
                const conflictErr = new Error("Snapshot mismatch");
                (conflictErr as Error & { isConflict: boolean }).isConflict = true;
                throw conflictErr;
              }
              if (r.retryAfter) throw new Error(`Rate limited (429)`);
              throw new Error(r.error);
            }
            return r;
          },
          (err) => isTransientError(err),
          { maxRetries: 3 }
        );

        const removeSnapshot = (removeResult.data as Record<string, string>)?.snapshot_id;

        // Step 2: Add variant at position (with retry)
        const addResult = await withRetry(
          async () => {
            const r = await spotifyFetch(
              `https://api.spotify.com/v1/playlists/${playlistApiId}/tracks`,
              accessToken,
              {
                method: "POST",
                body: JSON.stringify({ uris: [trackUri], position: original_track_position }),
              }
            );
            if (r.error) {
              if (r.retryAfter) throw new Error(`Rate limited (429)`);
              throw new Error(r.error);
            }
            return r;
          },
          (err) => isTransientError(err),
          { maxRetries: 3 }
        );

        const finalSnapshot = (addResult.data as Record<string, string>)?.snapshot_id ?? removeSnapshot;
        await updateJob(admin, jobId, "success", null, finalSnapshot);
        await updatePlaylistSnapshot(admin, playlist_id, finalSnapshot);
        log.jobTransition("mutation", jobId ?? "unknown", "pending", "success");

        return respond({ status: "success", snapshot_id: finalSnapshot });
      } catch (err) {
        const isConflict = (err as Error & { isConflict?: boolean }).isConflict;
        if (isConflict) {
          await updateJob(admin, jobId, "conflict", "Snapshot mismatch");
          return respond({ status: "conflict", error: "Playlist was modified" });
        }
        const msg = err instanceof Error ? err.message : String(err);
        await markDeadLetter(admin, jobId, msg);
        log.jobTransition("mutation", jobId ?? "unknown", "pending", "dead_letter", { error: msg });
        return respond({ error: msg, status: "failed" });
      }
    }

    return respond({ error: "Invalid mutation_type" }, 400);
  } catch (err) {
    log.error("mutate-playlist unhandled error", { error: String(err) });
    return respond({ error: "Internal server error" }, 500);
  }
});

async function updateJob(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string | undefined,
  status: string,
  errorMessage: string | null,
  snapshotAfter?: string
) {
  if (!jobId) return;
  await admin
    .from("mutation_jobs")
    .update({
      status,
      error_message: errorMessage,
      snapshot_id_after: snapshotAfter ?? null,
      completed_at: new Date().toISOString(),
      last_attempted_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function markDeadLetter(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string | undefined,
  errorMessage: string
) {
  if (!jobId) return;
  await admin
    .from("mutation_jobs")
    .update({
      status: "failed",
      is_dead_letter: true,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      last_attempted_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function updatePlaylistSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  playlistId: string,
  snapshotId: string | undefined
) {
  if (!snapshotId) return;
  await admin
    .from("spotify_playlists")
    .update({ snapshot_id: snapshotId })
    .eq("id", playlistId);
}

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
