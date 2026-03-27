import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient, verifyUserAuth } from "../_shared/supabase-admin.ts";
import { spotifyFetch, refreshSpotifyToken } from "../_shared/spotify.ts";
import { loadConfig, resetConfigCache } from "../_shared/config.ts";
import {
  scoreVariant,
  applyFreshnessDecay,
  deduplicationKey,
  getConfidenceTier,
  type ScoringInput,
} from "../_shared/scoring.ts";

interface DiscoverRequest {
  track_id: string;
  variant_type: string;
  force_refresh?: boolean;
}

interface SpotifySearchTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { images: Array<{ url: string }> };
  duration_ms: number;
  preview_url: string | null;
}

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium?: { url: string } };
  };
}

interface YouTubeVideoItem {
  id: string;
  contentDetails?: { duration: string };
  status?: { embeddable: boolean; privacyStatus: string; uploadStatus: string };
}

interface OriginalTrack {
  title: string;
  artist_name: string;
  spotify_track_id: string;
  duration_ms: number;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  resetConfigCache();

  try {
    const userId = await verifyUserAuth(req);
    if (!userId) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const body: DiscoverRequest = await req.json();
    const { track_id, variant_type, force_refresh } = body;

    if (!track_id || !variant_type) {
      return respond({ error: "track_id and variant_type are required" }, 400);
    }

    const admin = createAdminClient();
    const config = await loadConfig();

    // -----------------------------------------------------------------------
    // TTL-aware cache check
    // -----------------------------------------------------------------------
    if (!force_refresh) {
      const { data: cached } = await admin
        .from("track_variants")
        .select("*")
        .eq("original_track_id", track_id)
        .eq("variant_type", variant_type);

      if (cached && cached.length > 0) {
        const oldestDiscovery = cached.reduce(
          (min: string, v: Record<string, unknown>) =>
            (v.discovered_at as string) < min ? (v.discovered_at as string) : min,
          cached[0].discovered_at as string
        );
        const ageHours =
          (Date.now() - new Date(oldestDiscovery).getTime()) / 3_600_000;

        if (ageHours <= config.variantTtlHours) {
          // Apply freshness decay and sort
          const scored = cached.map((v: Record<string, unknown>) => ({
            ...v,
            _adjustedScore: applyFreshnessDecay(
              (v.relevance_score as number) ?? 0,
              v.discovered_at as string,
              config.variantTtlHours
            ),
          }));
          scored.sort(
            (a: { _adjustedScore: number }, b: { _adjustedScore: number }) =>
              b._adjustedScore - a._adjustedScore
          );

          const active = scored.filter(
            (v: Record<string, unknown>) => v.status !== "rejected"
          );
          const rejected = scored.filter(
            (v: Record<string, unknown>) => v.status === "rejected"
          );

          const topScore = active[0]?._adjustedScore ?? 0;
          return respond({
            variants: active.map(stripInternal),
            rejected: rejected.map(stripInternal),
            fromCache: true,
            confidenceTier: getConfidenceTier(topScore, config.scoringThresholds),
          });
        }
        // Cache is stale — fall through to re-discover
      }
    }

    // -----------------------------------------------------------------------
    // Fetch original track metadata (including duration for scoring)
    // -----------------------------------------------------------------------
    const { data: originalTrack } = await admin
      .from("spotify_tracks")
      .select("title, artist_name, spotify_track_id, duration_ms")
      .eq("id", track_id)
      .single();

    if (!originalTrack) {
      return respond({ error: "Track not found" }, 404);
    }

    // -----------------------------------------------------------------------
    // Resolve Spotify access token
    // -----------------------------------------------------------------------
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
      if (tokenData) {
        accessToken = tokenData.access_token;
        await admin
          .from("users")
          .update({
            spotify_access_token: tokenData.access_token,
            spotify_refresh_token:
              tokenData.refresh_token ?? user.spotify_refresh_token,
            token_expires_at: new Date(
              Date.now() + tokenData.expires_in * 1000
            ).toISOString(),
          })
          .eq("id", userId);
      }
    }

    // -----------------------------------------------------------------------
    // Discover from both platforms
    // -----------------------------------------------------------------------
    const allVariants: Array<Record<string, unknown>> = [];

    const spotifyVariants = await searchSpotify(
      admin,
      accessToken,
      originalTrack,
      variant_type,
      track_id,
      config
    );
    allVariants.push(...spotifyVariants);

    const youtubeVariants = await searchYouTube(
      admin,
      originalTrack,
      variant_type,
      track_id,
      config
    );
    allVariants.push(...youtubeVariants);

    // -----------------------------------------------------------------------
    // Cross-platform duplicate detection
    // -----------------------------------------------------------------------
    const seen = new Map<string, Record<string, unknown>>();
    for (const v of allVariants) {
      const key = deduplicationKey(
        v.title as string,
        v.artist_or_channel as string
      );
      const existing = seen.get(key);
      if (existing) {
        const existingScore = (existing.relevance_score as number) ?? 0;
        const currentScore = (v.relevance_score as number) ?? 0;
        if (currentScore > existingScore) {
          // Mark the old one as duplicate of the new higher-scored one
          await admin
            .from("track_variants")
            .update({ duplicate_of: v.id })
            .eq("id", existing.id);
          seen.set(key, v);
        } else {
          await admin
            .from("track_variants")
            .update({ duplicate_of: existing.id })
            .eq("id", v.id);
        }
      } else {
        seen.set(key, v);
      }
    }

    // Sort by relevance_score DESC
    const dedupedVariants = Array.from(seen.values());
    dedupedVariants.sort(
      (a, b) =>
        ((b.relevance_score as number) ?? 0) -
        ((a.relevance_score as number) ?? 0)
    );

    const active = dedupedVariants.filter((v) => v.status !== "rejected");
    const rejected = dedupedVariants.filter((v) => v.status === "rejected");

    const topScore = (active[0]?.relevance_score as number) ?? 0;

    return respond({
      variants: active,
      rejected,
      fromCache: false,
      confidenceTier: getConfidenceTier(topScore, config.scoringThresholds),
    });
  } catch (err) {
    console.error("discover-variants error:", err);
    return respond({ error: "Internal server error" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Spotify search with scoring
// ---------------------------------------------------------------------------

async function searchSpotify(
  admin: ReturnType<typeof createAdminClient>,
  accessToken: string,
  originalTrack: OriginalTrack,
  variantType: string,
  trackId: string,
  config: Awaited<ReturnType<typeof loadConfig>>
): Promise<Array<Record<string, unknown>>> {
  let query: string;
  const title = originalTrack.title;
  const artist = originalTrack.artist_name.split(",")[0].trim();

  if (variantType === "cover") {
    query = `track:"${title}" ${variantType} -artist:"${artist}"`;
  } else {
    query = `track:"${title}" artist:"${artist}" ${variantType}`;
  }

  const result = await spotifyFetch<{
    tracks: { items: SpotifySearchTrack[] };
  }>(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
    accessToken
  );

  if (result.error || !result.data) return [];

  const variants: Array<Record<string, unknown>> = [];

  for (const track of result.data.tracks.items) {
    if (track.id === originalTrack.spotify_track_id) continue;

    const { data: existing } = await admin
      .from("track_variants")
      .select("id")
      .eq("platform_id", track.id)
      .maybeSingle();

    if (existing) {
      const { data: full } = await admin
        .from("track_variants")
        .select("*")
        .eq("id", existing.id)
        .single();
      if (full) variants.push(full);
      continue;
    }

    const scoringInput: ScoringInput = {
      spotifyTitle: originalTrack.title,
      spotifyArtist: originalTrack.artist_name,
      spotifyDurationMs: originalTrack.duration_ms,
      candidateTitle: track.name,
      candidateChannel: track.artists.map((a) => a.name).join(", "),
      candidateDurationMs: track.duration_ms,
    };

    const scoring = scoreVariant(
      scoringInput,
      config.scoringWeights,
      config.durationMaxRatio,
      config.durationMinRatio,
      config.scoringThresholds
    );

    const row = {
      original_track_id: trackId,
      platform: "spotify" as const,
      platform_id: track.id,
      variant_type: variantType,
      title: track.name,
      artist_or_channel: track.artists.map((a) => a.name).join(", "),
      thumbnail_url: track.album?.images?.[0]?.url ?? null,
      duration_ms: track.duration_ms,
      embeddable: true,
      status: scoring.hardRejected ? ("rejected" as const) : ("active" as const),
      rejection_reason: scoring.hardRejectReason,
      relevance_score: Math.round(scoring.score * 100) / 100,
    };

    const { data: inserted } = await admin
      .from("track_variants")
      .insert(row)
      .select("*")
      .single();

    if (inserted) variants.push(inserted);
  }

  return variants;
}

// ---------------------------------------------------------------------------
// YouTube search with scoring
// ---------------------------------------------------------------------------

async function searchYouTube(
  admin: ReturnType<typeof createAdminClient>,
  originalTrack: OriginalTrack,
  variantType: string,
  trackId: string,
  config: Awaited<ReturnType<typeof loadConfig>>
): Promise<Array<Record<string, unknown>>> {
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return [];

  const title = originalTrack.title;
  const artist = originalTrack.artist_name.split(",")[0].trim();
  const query = `"${title}" "${artist}" ${variantType} -karaoke`;

  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    videoEmbeddable: "true",
    videoCategoryId: "10",
    maxResults: "10",
    key: apiKey,
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`
  );

  if (!res.ok) {
    console.error("YouTube search failed:", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  const items: YouTubeSearchItem[] = data.items ?? [];
  const variants: Array<Record<string, unknown>> = [];

  const freshVideoIds: string[] = [];
  const freshItemsByVideoId = new Map<string, YouTubeSearchItem>();

  for (const item of items) {
    const videoId = item.id.videoId;
    const { data: existing } = await admin
      .from("track_variants")
      .select("id")
      .eq("platform_id", videoId)
      .maybeSingle();

    if (existing) {
      const { data: full } = await admin
        .from("track_variants")
        .select("*")
        .eq("id", existing.id)
        .single();
      if (full) variants.push(full);
    } else {
      freshVideoIds.push(videoId);
      freshItemsByVideoId.set(videoId, item);
    }
  }

  const videoDetails = await fetchVideoDetails(freshVideoIds, apiKey);

  for (const videoId of freshVideoIds) {
    const item = freshItemsByVideoId.get(videoId)!;
    const snippet = item.snippet;
    const decodedTitle = decodeHtmlEntities(snippet.title);
    const hardFilterReason = applyHardFilters(decodedTitle);

    const detail = videoDetails.get(videoId);
    const isEmbeddable =
      detail?.status
        ? detail.status.embeddable && detail.status.privacyStatus === "public"
        : true;

    const durationMs = detail?.contentDetails
      ? parseISO8601Duration(detail.contentDetails.duration)
      : null;

    const scoringInput: ScoringInput = {
      spotifyTitle: originalTrack.title,
      spotifyArtist: originalTrack.artist_name,
      spotifyDurationMs: originalTrack.duration_ms,
      candidateTitle: decodedTitle,
      candidateChannel: decodeHtmlEntities(snippet.channelTitle),
      candidateDurationMs: durationMs,
    };

    const scoring = scoreVariant(
      scoringInput,
      config.scoringWeights,
      config.durationMaxRatio,
      config.durationMinRatio,
      config.scoringThresholds
    );

    const isRejected = !!hardFilterReason || scoring.hardRejected;
    const rejectionReason =
      hardFilterReason ?? scoring.hardRejectReason ?? null;

    const row = {
      original_track_id: trackId,
      platform: "youtube" as const,
      platform_id: videoId,
      variant_type: variantType,
      title: decodedTitle,
      artist_or_channel: decodeHtmlEntities(snippet.channelTitle),
      thumbnail_url: snippet.thumbnails?.medium?.url ?? null,
      duration_ms: durationMs,
      embeddable: isEmbeddable,
      status: isRejected ? ("rejected" as const) : ("active" as const),
      rejection_reason: rejectionReason,
      relevance_score: Math.round(scoring.score * 100) / 100,
    };

    const { data: inserted } = await admin
      .from("track_variants")
      .insert(row)
      .select("*")
      .single();

    if (inserted) variants.push(inserted);
  }

  return variants;
}

// ---------------------------------------------------------------------------
// YouTube video details (status + contentDetails for duration)
// ---------------------------------------------------------------------------

async function fetchVideoDetails(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, YouTubeVideoItem>> {
  const detailMap = new Map<string, YouTubeVideoItem>();
  if (videoIds.length === 0) return detailMap;

  const params = new URLSearchParams({
    part: "status,contentDetails",
    id: videoIds.join(","),
    key: apiKey,
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params}`
  );

  if (!res.ok) {
    console.warn("fetchVideoDetails failed:", res.status, await res.text());
    return detailMap;
  }

  const data = await res.json();
  for (const item of data.items ?? []) {
    detailMap.set(item.id, item as YouTubeVideoItem);
  }
  return detailMap;
}

// ---------------------------------------------------------------------------
// ISO 8601 duration → milliseconds (e.g. "PT3M45S" → 225000)
// ---------------------------------------------------------------------------

function parseISO8601Duration(iso: string): number | null {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_: string, code: string) =>
      String.fromCharCode(Number(code))
    );
}

function applyHardFilters(title: string): string | null {
  const lower = title.toLowerCase();
  if (lower.includes("karaoke")) return "Karaoke track detected";
  if (lower.includes("instrumental") && !lower.includes("cover"))
    return "Instrumental-only track";
  if (lower.includes("tutorial") || lower.includes("lesson"))
    return "Tutorial/lesson content";
  return null;
}

function stripInternal(v: Record<string, unknown>): Record<string, unknown> {
  const result = { ...v };
  delete result._adjustedScore;
  return result;
}

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
