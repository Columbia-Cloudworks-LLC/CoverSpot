"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, EyeOff, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
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
      className={`rounded-xl border border-border p-3 space-y-3 ${
        isRejected ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {variant.thumbnail_url ? (
          <Image
            src={variant.thumbnail_url}
            alt=""
            width={48}
            height={48}
            sizes="48px"
            loading="lazy"
            className="h-12 w-12 rounded object-cover shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded bg-muted shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium line-clamp-2">{variant.title}</p>
          <p className="text-caption text-foreground/75 truncate">
            {variant.artist_or_channel}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={variant.platform === "spotify" ? "default" : "secondary"}
            >
              {variant.platform === "spotify" ? "Spotify" : "YouTube"}
            </Badge>
            {durationStr && (
              <span className="text-caption text-foreground/75">
                {durationStr}
              </span>
            )}
          </div>
        </div>
      </div>

      {isRejected && variant.rejection_reason && (
        <p className="text-caption text-destructive">{variant.rejection_reason}</p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant={variant.platform === "youtube" ? "default" : "secondary"}
          size="sm"
          onClick={() => setShowPlayer(!showPlayer)}
          className="cursor-pointer min-h-11 gap-1.5"
        >
          {showPlayer ? (
            <>
              <EyeOff className="size-3.5" />
              Hide
            </>
          ) : (
            <>
              <Play className="size-3.5" />
              Preview
            </>
          )}
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
          <Tooltip content="YouTube variants can be previewed but not added to your Spotify playlist.">
            <span className="text-caption text-foreground/75 ml-auto cursor-default underline decoration-dotted underline-offset-2">
              Preview only
            </span>
          </Tooltip>
        )}
      </div>

      {showPlayer && (
        <div className="pt-2">
          {variant.platform === "youtube" && variant.embeddable ? (
            <YouTubePlayer videoId={variant.platform_id} />
          ) : variant.platform === "spotify" ? (
            <SpotifyPreview trackId={variant.platform_id} />
          ) : variant.platform === "youtube" ? (
            <div className="space-y-2">
              <p className="text-caption text-foreground/75">
                Embedded playback is not available for this video.
              </p>
              <a
                href={`https://www.youtube.com/watch?v=${variant.platform_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:underline"
              >
                Watch on YouTube
                <ExternalLink className="size-3" />
              </a>
            </div>
          ) : (
            <p className="text-caption text-foreground/75">
              Playback not available for this variant.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
