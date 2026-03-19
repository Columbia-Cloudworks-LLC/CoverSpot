"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MutationButtonsProps {
  variantId: string;
  variantPlatformId: string;
  playlistId: string;
  spotifyPlaylistId: string;
  snapshotId: string;
  originalTrackPosition: number;
}

export function MutationButtons({
  variantId,
  variantPlatformId,
  playlistId,
  spotifyPlaylistId,
  snapshotId,
  originalTrackPosition,
}: MutationButtonsProps) {
  const [mutating, setMutating] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [lastAction, setLastAction] = useState<"add" | "swap" | null>(null);

  const handleMutation = async (type: "add" | "swap") => {
    setMutating(true);
    setLastAction(type);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "mutate-playlist",
        {
          body: {
            playlist_id: playlistId,
            spotify_playlist_id: spotifyPlaylistId,
            variant_id: variantId,
            variant_platform_id: variantPlatformId,
            mutation_type: type,
            original_track_position: originalTrackPosition,
            snapshot_id: snapshotId,
          },
        }
      );

      if (error) {
        toast.error("Mutation failed");
        console.error("Mutation error:", error);
        return;
      }

      if (data?.status === "conflict") {
        setShowConflict(true);
        return;
      }

      if (data?.status === "success") {
        toast.success(
          type === "add"
            ? "Track added to playlist"
            : "Track swapped in playlist"
        );
      } else {
        toast.error(data?.error ?? "Mutation failed");
      }
    } catch (err) {
      toast.error("Mutation failed unexpectedly");
      console.error(err);
    } finally {
      setMutating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleMutation("add")}
        disabled={mutating}
        className="cursor-pointer min-h-11 gap-1.5"
      >
        {mutating && lastAction === "add" && <Loader2 className="size-3.5 animate-spin" />}
        {mutating && lastAction === "add" ? "Adding..." : "Add"}
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={() => handleMutation("swap")}
        disabled={mutating}
        className="cursor-pointer min-h-11 gap-1.5"
      >
        {mutating && lastAction === "swap" && <Loader2 className="size-3.5 animate-spin" />}
        {mutating && lastAction === "swap" ? "Swapping..." : "Swap"}
      </Button>

      <Dialog open={showConflict} onOpenChange={setShowConflict}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Playlist Modified</DialogTitle>
            <DialogDescription>
              The playlist was modified since you last synced. Please re-sync the
              playlist and try again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConflict(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowConflict(false);
                if (lastAction) handleMutation(lastAction);
              }}
              className="cursor-pointer"
            >
              Retry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
