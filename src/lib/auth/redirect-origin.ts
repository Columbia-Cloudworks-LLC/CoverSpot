const DEFAULT_APP_ORIGIN = "https://coverspot.app";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

function getConfiguredAppOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (!configured) {
    return DEFAULT_APP_ORIGIN;
  }

  try {
    return normalizeOrigin(new URL(configured).origin);
  } catch {
    return DEFAULT_APP_ORIGIN;
  }
}

export function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getCanonicalOriginForUrl(url: URL): string {
  if (isLocalHostname(url.hostname)) {
    return url.origin;
  }

  return getConfiguredAppOrigin();
}

/**
 * OAuth callback URL on the canonical app origin. The browser must already be
 * on that origin when starting PKCE (`signInWithOAuth`) so verifier cookies
 * match `exchangeCodeForSession` on `/auth/callback`.
 */
export function getOAuthRedirectTo(currentOrigin: string): string {
  const parsedOrigin = new URL(currentOrigin);
  const redirectOrigin = getCanonicalOriginForUrl(parsedOrigin);

  return `${redirectOrigin}/auth/callback`;
}
