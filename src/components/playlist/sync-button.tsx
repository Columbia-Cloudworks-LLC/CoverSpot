"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, getAccessToken } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    const toastId = toast.loading("Syncing playlists from Spotify...");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error("Session expired. Please log in again.", { id: toastId });
        router.push("/");
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "sync-playlists",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (error) {
        let message = "Sync failed. Please try again.";
        const context = (error as { context?: Response }).context;
        if (context) {
          const body = await context.clone().json().catch(() => null) as
            | { error?: string; needsReauth?: boolean }
            | null;
          if (body?.needsReauth) {
            message = "Spotify session expired. Please log in again.";
            router.push("/");
          } else if (body?.error) {
            message = body.error;
          }
        }

        toast.error(message, { id: toastId });
        console.error("Sync error:", error);
        return;
      }

      const playlists = data.playlistsSynced ?? 0;
      const tracks = data.tracksSynced ?? 0;
      const playlistWord = playlists === 1 ? "playlist" : "playlists";
      const trackWord = tracks === 1 ? "track" : "tracks";
      const message =
        tracks === 0
          ? `Synced ${playlists} ${playlistWord}. No track changes detected.`
          : `Synced ${playlists} ${playlistWord} and ${tracks} ${trackWord} updated.`;
      toast.success(message, { id: toastId });
      router.refresh();
    } catch (err) {
      toast.error("Sync failed unexpectedly.", { id: toastId });
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      className="cursor-pointer min-h-11 px-4 gap-2"
    >
      {syncing && <Loader2 className="size-4 animate-spin" />}
      {syncing ? "Syncing..." : "Sync Playlists"}
    </Button>
  );
}
