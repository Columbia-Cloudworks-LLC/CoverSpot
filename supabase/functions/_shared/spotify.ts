export interface SpotifyFetchResult<T = unknown> {
  data: T | null;
  error: string | null;
  retryAfter?: number;
  needsReauth?: boolean;
}

/** Thrown when Spotify returns 401 so callers can return needsReauth (not swallowed as generic failure). */
export class SpotifyReauthRequiredError extends Error {
  constructor() {
    super("Token expired (401)");
    this.name = "SpotifyReauthRequiredError";
  }
}

export async function spotifyFetch<T = unknown>(
  url: string,
  accessToken: string,
  options?: RequestInit
): Promise<SpotifyFetchResult<T>> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 204) {
    return { data: null, error: null };
  }

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "1", 10);
    return {
      data: null,
      error: `Rate limited. Retry after ${retryAfter}s`,
      retryAfter,
    };
  }

  if (res.status === 401) {
    return { data: null, error: "Token expired", needsReauth: true };
  }

  if (!res.ok) {
    const body = await res.text();
    return { data: null, error: `Spotify API ${res.status}: ${body}` };
  }

  const data = (await res.json()) as T;
  return { data, error: null };
}

export async function refreshSpotifyToken(
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
} | null> {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    console.error("Token refresh failed:", res.status, await res.text());
    return null;
  }

  return res.json();
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jitter(baseMs: number): number {
  return baseMs + Math.random() * 1000;
}
