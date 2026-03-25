import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getCanonicalOriginForUrl, isLocalHostname } from "@/lib/auth/redirect-origin";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.hostname === "127.0.0.1") {
    const localhostUrl = request.nextUrl.clone();
    localhostUrl.hostname = "localhost";
    return NextResponse.redirect(localhostUrl);
  }

  const canonicalOrigin = getCanonicalOriginForUrl(request.nextUrl);
  const requestIsLocal = isLocalHostname(request.nextUrl.hostname);
  const shouldCanonicalRedirect = !requestIsLocal && canonicalOrigin !== request.nextUrl.origin;

  if (shouldCanonicalRedirect) {
    const redirectUrl = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      canonicalOrigin
    );
    return NextResponse.redirect(redirectUrl);
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const isProtected =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/playlist");

  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
