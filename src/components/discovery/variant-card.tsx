"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { YouTubePlayer } from "@/components/playback/youtube-player";
import { SpotifyPreview } from "@/components/playback/spotify-preview";
import { MutationButtons } from "@/components/mutation/mutation-buttons";

interface Variant {
  id: string;
  platform: "spotify" | "youtube";
  platform_id: string;
  variant_type: string;
  title: string;
  artist_or_channel: string;
  thumbnail_url: string | null;
  duration_ms: number | null;
  embeddable: boolean;
  status: string;
  rejection_reason: string | null;
}

interface VariantCardProps {
  variant: Variant;
  playlistId: string;
  spotifyPlaylistId: string;
  snapshotId: string;
  originalTrackPosition: number;
  isRejected?: boolean;
}

export function VariantCard({
  variant,
  playlistId,
  spotifyPlaylistId,
  snapshotId,
  originalTrackPosition,
  isRejected,
}: VariantCardProps) {
  const [showPlayer, setShowPlayer] = useState(false);

  const durationStr = variant.duration_ms
    ? `${Math.floor(variant.duration_ms / 60000)}:${Math.floor(
        (variant.duration_ms % 60000) / 1000
      )
        .toString()
        .padStart(2, "0")}`
    : null;

  return (
    <div
      className={`rounded-md border border-border p-3 space-y-2 ${
        isRejected ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {variant.thumbnail_url ? (
          <img
            src={variant.thumbnail_url}
            alt=""
            className="h-12 w-12 rounded object-cover shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded bg-muted shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{variant.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {variant.artist_or_channel}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={variant.platform === "spotify" ? "default" : "secondary"}
              className="text-xs"
            >
              {variant.platform === "spotify" ? "Spotify" : "YouTube"}
            </Badge>
            {durationStr && (
              <span className="text-xs text-muted-foreground">
                {durationStr}
              </span>
            )}
          </div>
        </div>
      </div>

      {isRejected && variant.rejection_reason && (
        <p className="text-xs text-destructive">{variant.rejection_reason}</p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPlayer(!showPlayer)}
          className="text-xs cursor-pointer"
        >
          {showPlayer ? "Hide" : "Preview"}
        </Button>

        {!isRejected && variant.platform === "spotify" && (
          <MutationButtons
            variantId={variant.id}
            variantPlatformId={variant.platform_id}
            playlistId={playlistId}
            spotifyPlaylistId={spotifyPlaylistId}
            snapshotId={snapshotId}
            originalTrackPosition={originalTrackPosition}
          />
        )}

        {!isRejected && variant.platform === "youtube" && (
          <span className="text-xs text-muted-foreground ml-auto">
            Preview only
          </span>
        )}
      </div>

      {showPlayer && (
        <div className="pt-2">
          {variant.platform === "youtube" && variant.embeddable ? (
            <YouTubePlayer videoId={variant.platform_id} />
          ) : variant.platform === "spotify" ? (
            <SpotifyPreview trackId={variant.platform_id} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Playback not available for this variant.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
