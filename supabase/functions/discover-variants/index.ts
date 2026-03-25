import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createAdminClient, verifyUserAuth } from "../_shared/supabase-admin.ts";
import { spotifyFetch, refreshSpotifyToken } from "../_shared/spotify.ts";

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

interface YouTubeVideoStatus {
  embeddable: boolean;
  privacyStatus: string;
  uploadStatus: string;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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

    if (!force_refresh) {
      const { data: cached } = await admin
        .from("track_variants")
        .select("*")
        .eq("original_track_id", track_id)
        .eq("variant_type", variant_type);

      if (cached && cached.length > 0) {
        const active = cached.filter((v: Record<string, unknown>) => v.status !== "rejected");
        const rejected = cached.filter((v: Record<string, unknown>) => v.status === "rejected");
        return respond({ variants: active, rejected, fromCache: true });
      }
    }

    const { data: originalTrack } = await admin
      .from("spotify_tracks")
      .select("title, artist_name, spotify_track_id")
      .eq("id", track_id)
      .single();

    if (!originalTrack) {
      return respond({ error: "Track not found" }, 404);
    }

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
            spotify_refresh_token: tokenData.refresh_token ?? user.spotify_refresh_token,
            token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          })
          .eq("id", userId);
      }
    }

    const allVariants: Array<Record<string, unknown>> = [];

    const spotifyVariants = await searchSpotify(
      admin,
      accessToken,
      originalTrack,
      variant_type,
      track_id
    );
    allVariants.push(...spotifyVariants);

    const youtubeVariants = await searchYouTube(
      admin,
      originalTrack,
      variant_type,
      track_id
    );
    allVariants.push(...youtubeVariants);

    const active = allVariants.filter((v) => v.status !== "rejected");
    const rejected = allVariants.filter((v) => v.status === "rejected");

    return respond({ variants: active, rejected, fromCache: false });
  } catch (err) {
    console.error("discover-variants error:", err);
    return respond({ error: "Internal server error" }, 500);
  }
});

async function searchSpotify(
  admin: ReturnType<typeof createAdminClient>,
  accessToken: string,
  originalTrack: { title: string; artist_name: string; spotify_track_id: string },
  variantType: string,
  trackId: string
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
      status: "active" as const,
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

async function searchYouTube(
  admin: ReturnType<typeof createAdminClient>,
  originalTrack: { title: string; artist_name: string },
  variantType: string,
  trackId: string
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

  const freshVideoIds = [] as string[];
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

  const videoStatuses = await fetchVideoStatuses(freshVideoIds, apiKey);

  for (const videoId of freshVideoIds) {
    const item = freshItemsByVideoId.get(videoId)!;
    const snippet = item.snippet;
    const decodedTitle = decodeHtmlEntities(snippet.title);
    const rejectionReason = applyHardFilters(decodedTitle);

    const status = videoStatuses.get(videoId);
    const isEmbeddable =
      status !== undefined
        ? status.embeddable && status.privacyStatus === "public"
        : true;

    const row = {
      original_track_id: trackId,
      platform: "youtube" as const,
      platform_id: videoId,
      variant_type: variantType,
      title: decodedTitle,
      artist_or_channel: decodeHtmlEntities(snippet.channelTitle),
      thumbnail_url: snippet.thumbnails?.medium?.url ?? null,
      embeddable: isEmbeddable,
      status: rejectionReason ? ("rejected" as const) : ("active" as const),
      rejection_reason: rejectionReason,
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

async function fetchVideoStatuses(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, YouTubeVideoStatus>> {
  const statusMap = new Map<string, YouTubeVideoStatus>();
  if (videoIds.length === 0) return statusMap;

  const params = new URLSearchParams({
    part: "status",
    id: videoIds.join(","),
    key: apiKey,
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params}`
  );

  if (!res.ok) {
    console.warn("fetchVideoStatuses failed:", res.status, await res.text());
    return statusMap;
  }

  const data = await res.json();
  for (const item of data.items ?? []) {
    statusMap.set(item.id, item.status as YouTubeVideoStatus);
  }
  return statusMap;
}

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

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
