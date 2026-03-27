import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient, verifyUserAuth } from "../_shared/supabase-admin.ts";
import {
  spotifyFetch,
  refreshSpotifyToken,
  SpotifyReauthRequiredError,
} from "../_shared/spotify.ts";
import { withRetry, isTransientError } from "../_shared/retry.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("sync-playlists");

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  collaborative: boolean;
  snapshot_id: string;
  images: Array<{ url: string }>;
  tracks: { total: number };
}

interface SpotifyTrackItem {
  added_at: string;
  track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
    duration_ms: number;
    preview_url: string | null;
  } | null;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = await verifyUserAuth(req);
    if (!userId) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const admin = createAdminClient();

    const { data: syncJob } = await admin
      .from("sync_jobs")
      .insert({ user_id: userId, status: "running" })
      .select("id")
      .single();

    const syncJobId = syncJob?.id;
    log.jobTransition("sync", syncJobId ?? "unknown", "new", "running");

    const { data: user } = await admin
      .from("users")
      .select("spotify_access_token, spotify_refresh_token, token_expires_at")
      .eq("id", userId)
      .single();

    if (!user) {
      await updateSyncJob(admin, syncJobId, "failed", "User not found");
      return respond({ error: "User not found" }, 404);
    }

    let accessToken = user.spotify_access_token;
    const expiresAt = new Date(user.token_expires_at).getTime();
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      const tokenData = await refreshSpotifyToken(user.spotify_refresh_token);
      if (!tokenData) {
        console.warn("sync-playlists: refresh failed, retrying with stored access token");
      } else {
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
    }

    let playlistsSynced = 0;
    let tracksSynced = 0;
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const result = await withRetry(
        async () => {
          const r = await spotifyFetch<{
            items: SpotifyPlaylist[];
            total: number;
            next: string | null;
          }>(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, accessToken);

          if (r.error) {
            if (r.retryAfter) {
              log.httpError("spotify", 429, `Retry-After: ${r.retryAfter}s`);
              throw new Error(`Rate limited. Retry after ${r.retryAfter}s (429)`);
            }
            if (r.needsReauth) {
              throw new SpotifyReauthRequiredError();
            }
            throw new Error(r.error);
          }
          return r;
        },
        (err) => isTransientError(err),
        { maxRetries: 3 }
      ).catch((err: unknown) => {
        if (err instanceof SpotifyReauthRequiredError) throw err;
        log.error("Playlist fetch failed after retries", { error: String(err), offset });
        return null;
      });

      if (!result || !result.data) {
        await markDeadLetter(admin, syncJobId, "sync_jobs", "Playlist fetch failed after retries");
        log.jobTransition("sync", syncJobId ?? "unknown", "running", "dead_letter");
        return respond({ error: "Sync failed after retries", needsReauth: false }, 500);
      }

      const playlists = result.data.items;

      for (const pl of playlists) {
        const { data: existing } = await admin
          .from("spotify_playlists")
          .select("id, snapshot_id")
          .eq("user_id", userId)
          .eq("spotify_playlist_id", pl.id)
          .maybeSingle();

        const playlistRow = {
          user_id: userId,
          spotify_playlist_id: pl.id,
          name: pl.name,
          description: pl.description,
          image_url: pl.images?.[0]?.url ?? null,
          is_collaborative: pl.collaborative,
          snapshot_id: pl.snapshot_id,
          total_tracks: pl.tracks.total,
          last_synced_at: new Date().toISOString(),
        };

        let internalPlaylistId: string;

        if (existing) {
          internalPlaylistId = existing.id;
          await admin
            .from("spotify_playlists")
            .update(playlistRow)
            .eq("id", existing.id);
        } else {
          const { data: inserted } = await admin
            .from("spotify_playlists")
            .insert(playlistRow)
            .select("id")
            .single();
          internalPlaylistId = inserted!.id;
        }

        const snapshotChanged = !existing || existing.snapshot_id !== pl.snapshot_id;

        if (snapshotChanged) {
          tracksSynced += await syncPlaylistTracks(
            admin,
            accessToken,
            pl.id,
            internalPlaylistId
          );
        }

        playlistsSynced++;
      }

      hasMore = result.data.next !== null;
      offset += limit;
    }

    await updateSyncJob(admin, syncJobId, "success", null, playlistsSynced, tracksSynced);
    log.jobTransition("sync", syncJobId ?? "unknown", "running", "success", {
      playlistsSynced,
      tracksSynced,
    });

    return respond({ playlistsSynced, tracksSynced });
  } catch (err) {
    if (err instanceof SpotifyReauthRequiredError) {
      await updateSyncJob(admin, syncJobId, "failed", "Token expired");
      log.jobTransition("sync", syncJobId ?? "unknown", "running", "failed");
      return respond({ error: "Token expired", needsReauth: true }, 401);
    }
    log.error("sync-playlists unhandled error", { error: String(err) });
    return respond({ error: "Internal server error" }, 500);
  }
});

async function syncPlaylistTracks(
  admin: ReturnType<typeof createAdminClient>,
  accessToken: string,
  spotifyPlaylistId: string,
  internalPlaylistId: string
): Promise<number> {
  await admin
    .from("playlist_tracks_link")
    .delete()
    .eq("playlist_id", internalPlaylistId);

  let offset = 0;
  const limit = 100;
  let hasMore = true;
  let position = 0;
  let totalSynced = 0;

  while (hasMore) {
    const result = await withRetry(
      async () => {
        const r = await spotifyFetch<{
          items: SpotifyTrackItem[];
          next: string | null;
        }>(
          `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks?limit=${limit}&offset=${offset}&fields=items(added_at,track(id,name,artists(name),album(name,images),duration_ms,preview_url)),next`,
          accessToken
        );

        if (r.error) {
          if (r.retryAfter) {
            throw new Error(`Rate limited (429). Retry after ${r.retryAfter}s`);
          }
          if (r.needsReauth) {
            throw new SpotifyReauthRequiredError();
          }
          throw new Error(r.error);
        }
        return r;
      },
      (err) => isTransientError(err),
      { maxRetries: 3 }
    ).catch((err: unknown) => {
      if (err instanceof SpotifyReauthRequiredError) throw err;
      log.error(`Track fetch failed for playlist ${spotifyPlaylistId}`, { error: String(err) });
      return null;
    });

    if (!result || !result.data) break;

    const items = result.data.items;

    for (const item of items) {
      if (!item.track?.id) continue;

      const { data: existingTrack } = await admin
        .from("spotify_tracks")
        .select("id")
        .eq("spotify_track_id", item.track.id)
        .maybeSingle();

      let trackId: string;

      if (existingTrack) {
        trackId = existingTrack.id;
      } else {
        const { data: inserted } = await admin
          .from("spotify_tracks")
          .insert({
            spotify_track_id: item.track.id,
            title: item.track.name,
            artist_name: item.track.artists.map((a) => a.name).join(", "),
            album_name: item.track.album?.name ?? null,
            album_image_url: item.track.album?.images?.[0]?.url ?? null,
            duration_ms: item.track.duration_ms,
            preview_url: item.track.preview_url,
          })
          .select("id")
          .single();
        trackId = inserted!.id;
      }

      await admin.from("playlist_tracks_link").insert({
        playlist_id: internalPlaylistId,
        track_id: trackId,
        position,
        added_at: item.added_at,
      });

      position++;
      totalSynced++;
    }

    hasMore = result.data.next !== null;
    offset += limit;
  }

  return totalSynced;
}

async function updateSyncJob(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string | undefined,
  status: string,
  errorMessage: string | null,
  playlistsSynced?: number,
  tracksSynced?: number
) {
  if (!jobId) return;
  await admin
    .from("sync_jobs")
    .update({
      status,
      error_message: errorMessage,
      playlists_synced: playlistsSynced ?? 0,
      tracks_synced: tracksSynced ?? 0,
      completed_at: new Date().toISOString(),
      last_attempted_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function markDeadLetter(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string | undefined,
  table: string,
  errorMessage: string
) {
  if (!jobId) return;
  await admin
    .from(table)
    .update({
      status: "failed",
      is_dead_letter: true,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      last_attempted_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
