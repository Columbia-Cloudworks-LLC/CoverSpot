import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getCanonicalOriginForUrl } from "@/lib/auth/redirect-origin";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const callbackOrigin = getCanonicalOriginForUrl(requestUrl);
  const searchParams = requestUrl.searchParams;
  const code = searchParams.get("code");

  if (callbackOrigin !== requestUrl.origin) {
    const callbackUrl = new URL(requestUrl.pathname + requestUrl.search, callbackOrigin);
    return NextResponse.redirect(callbackUrl);
  }

  if (!code) {
    return NextResponse.redirect(`${callbackOrigin}?error=no_code`);
  }

  const cookieStore = await cookies();
  const pendingCookies: Array<{name: string; value: string; options: Record<string, unknown>}> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            pendingCookies.push({ name, value, options: options as Record<string, unknown> });
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(`${callbackOrigin}?error=auth_failed`);
  }

  const { session } = data;
  const providerToken = session.provider_token;
  const providerRefreshToken = session.provider_refresh_token;

  if (providerToken && providerRefreshToken) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const spotifyId =
      session.user.user_metadata?.provider_id ??
      session.user.user_metadata?.sub ??
      "";

    const isPremium = session.user.user_metadata?.product === "premium";

    await admin.from("users").upsert(
      {
        id: session.user.id,
        spotify_id: spotifyId,
        email: session.user.email ?? "",
        spotify_access_token: providerToken,
        spotify_refresh_token: providerRefreshToken,
        token_expires_at: new Date(
          Date.now() + 3600 * 1000
        ).toISOString(),
        premium_status: isPremium,
      },
      { onConflict: "id" }
    );
  }

  const response = NextResponse.redirect(`${callbackOrigin}/dashboard`);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
