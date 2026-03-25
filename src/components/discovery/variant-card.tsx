"use client";

import Image from "next/image";
import { Play, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MutationButtons } from "@/components/mutation/mutation-buttons";
import { usePlayer, type PlayableVariant } from "@/lib/player-context";
import { cn } from "@/lib/utils";

interface Variant extends PlayableVariant {
  variant_type: string;
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
  const { play, currentVariant } = usePlayer();
  const isPlaying = currentVariant?.id === variant.id;

  const durationStr = variant.duration_ms
    ? `${Math.floor(variant.duration_ms / 60000)}:${Math.floor(
        (variant.duration_ms % 60000) / 1000
      )
        .toString()
        .padStart(2, "0")}`
    : null;

  const watchUrl = `https://www.youtube.com/watch?v=${variant.platform_id}`;

  const handlePlay = () => {
    if (!isRejected) play(variant);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border p-2 flex items-center gap-2.5 transition-colors",
        isPlaying && "border-primary/40 bg-primary/5",
        isRejected && "opacity-60"
      )}
    >
      {/* Clickable thumbnail — acts as album art; clicking starts the mini-player */}
      <button
        onClick={handlePlay}
        disabled={isRejected}
        aria-label={`Play ${variant.title}`}
        className={cn(
          "relative group/thumb shrink-0 h-11 w-11 rounded overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isRejected ? "cursor-default" : "cursor-pointer"
        )}
      >
        {variant.thumbnail_url ? (
          <Image
            src={variant.thumbnail_url}
            alt=""
            width={44}
            height={44}
            sizes="44px"
            loading="lazy"
            className="h-11 w-11 object-cover"
          />
        ) : (
          <div className="h-11 w-11 bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-xs">♫</span>
          </div>
        )}
        {!isRejected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
            <Play className="size-4 text-white fill-white" />
          </div>
        )}
      </button>

      {/* Metadata: title + artist + platform badge */}
      <div className="flex-1 min-w-0">
        <p className="text-body font-medium truncate leading-tight">{variant.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-caption text-muted-foreground truncate leading-tight">
            {variant.artist_or_channel}
          </p>
          <Badge
            variant={variant.platform === "spotify" ? "default" : "secondary"}
            className="shrink-0 text-[10px] px-1 py-0 leading-tight h-4"
          >
            {variant.platform === "spotify" ? "Spotify" : "YT"}
          </Badge>
        </div>
        {isRejected && variant.rejection_reason && (
          <p className="text-caption text-destructive mt-0.5 truncate">
            {variant.rejection_reason}
          </p>
        )}
      </div>

      {/* Duration */}
      {durationStr && (
        <span className="text-caption text-muted-foreground tabular-nums shrink-0">
          {durationStr}
        </span>
      )}

      {/* Action buttons */}
      {!isRejected && (
        <div className="flex items-center gap-1 shrink-0">
          {variant.platform === "youtube" && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open on YouTube"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
          {variant.platform === "spotify" && (
            <MutationButtons
              variantId={variant.id}
              variantPlatformId={variant.platform_id}
              playlistId={playlistId}
              spotifyPlaylistId={spotifyPlaylistId}
              snapshotId={snapshotId}
              originalTrackPosition={originalTrackPosition}
              compact
            />
          )}
        </div>
      )}
    </div>
  );
}
