"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getCanonicalOriginForUrl,
  getOAuthRedirectTo,
} from "@/lib/auth/redirect-origin";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  no_code: "Authorization was not completed. Please try again.",
  auth_failed: "Could not sign in with Spotify. Please try again.",
};

export function LoginButton({ errorCode }: { errorCode?: string }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const hasShownError = useRef(false);

  useEffect(() => {
    if (errorCode && ERROR_MESSAGES[errorCode] && !hasShownError.current) {
      hasShownError.current = true;
      toast.error(ERROR_MESSAGES[errorCode]);

      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [errorCode]);

  const handleLogin = async () => {
    if (isConnecting) return;

    const pageUrl = new URL(window.location.href);
    const canonicalOrigin = getCanonicalOriginForUrl(pageUrl);
    if (window.location.origin !== canonicalOrigin) {
      const target = new URL(pageUrl.pathname + pageUrl.search, canonicalOrigin);
      window.location.assign(target.toString());
      return;
    }

    setIsConnecting(true);

    try {
      const supabase = createClient();
      const scopes = process.env.NEXT_PUBLIC_SPOTIFY_SCOPES ?? "";
      const redirectTo = getOAuthRedirectTo(window.location.origin);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "spotify",
        options: {
          scopes,
          redirectTo,
        },
      });

      if (error) {
        toast.error("Could not connect to Spotify. Please try again.");
        setIsConnecting(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsConnecting(false);
    }
  };

  return (
    <Button
      size="lg"
      onClick={handleLogin}
      disabled={isConnecting}
      aria-busy={isConnecting || undefined}
      className={cn(
        "gap-2 text-black font-semibold text-base px-8 py-6 cursor-pointer",
        "bg-[#1DB954] hover:bg-[#1ed760]",
        "duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]",
        "active:scale-[0.97]"
      )}
    >
      {isConnecting ? (
        <Loader2 className="size-5 animate-spin" />
      ) : (
        <SpotifyIcon />
      )}
      {isConnecting ? "Connecting\u2026" : "Login with Spotify"}
    </Button>
  );
}

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
