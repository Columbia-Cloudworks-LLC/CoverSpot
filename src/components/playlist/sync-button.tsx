"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    const toastId = toast.loading("Syncing playlists from Spotify...");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("sync-playlists");

      if (error) {
        toast.error("Sync failed. Please try again.", { id: toastId });
        console.error("Sync error:", error);
        return;
      }

      toast.success(
        `Synced ${data.playlistsSynced} playlists and ${data.tracksSynced} tracks`,
        { id: toastId }
      );
      router.refresh();
    } catch (err) {
      toast.error("Sync failed unexpectedly.", { id: toastId });
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button onClick={handleSync} disabled={syncing} className="cursor-pointer">
      {syncing ? "Syncing..." : "Sync Playlists"}
    </Button>
  );
}
