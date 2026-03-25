"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronDown, ChevronUp, Music2 } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { Badge } from "@/components/ui/badge";

export function MiniPlayer() {
  const { currentVariant, stop } = usePlayer();
  const [collapsed, setCollapsed] = useState(false);

  if (!currentVariant) return null;

  const isYouTube = currentVariant.platform === "youtube";
  const isSpotify = currentVariant.platform === "spotify";
  const watchUrl = `https://www.youtube.com/watch?v=${currentVariant.platform_id}`;

  return (
    <div className="border-t border-border bg-background shrink-0">
      {/* Header row — always visible */}
      <div className="flex items-center gap-3 px-4 py-2 h-14">
        {/* Thumbnail */}
        <div className="shrink-0 h-9 w-9 rounded overflow-hidden bg-muted flex items-center justify-center">
          {currentVariant.thumbnail_url ? (
            <Image
              src={currentVariant.thumbnail_url}
              alt=""
              width={36}
              height={36}
              sizes="36px"
              className="h-9 w-9 object-cover"
            />
          ) : (
            <Music2 className="size-4 text-muted-foreground" />
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-meta font-medium truncate leading-tight">
            {currentVariant.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-caption text-muted-foreground truncate leading-tight">
              {currentVariant.artist_or_channel}
            </p>
            <Badge
              variant={isSpotify ? "default" : "secondary"}
              className="shrink-0 text-[10px] px-1 py-0 leading-tight h-4"
            >
              {isSpotify ? "Spotify" : "YT"}
            </Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {isYouTube && !currentVariant.embeddable && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-caption text-primary hover:underline"
            >
              Watch on YouTube
            </a>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand player" : "Collapse player"}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            {collapsed ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
          <button
            onClick={stop}
            aria-label="Close player"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Embedded player — hidden when collapsed */}
      {!collapsed && (
        <div className="px-4 pb-3">
          {isYouTube && currentVariant.embeddable && (
            <div className="relative w-full overflow-hidden rounded-md bg-black" style={{ aspectRatio: "16/9", maxHeight: "200px" }}>
              <iframe
                src={`https://www.youtube.com/embed/${currentVariant.platform_id}?autoplay=1&modestbranding=1&rel=0`}
                title={currentVariant.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            </div>
          )}
          {isYouTube && !currentVariant.embeddable && (
            <p className="text-caption text-muted-foreground">
              Embedded playback is unavailable for this video.{" "}
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Watch on YouTube
              </a>
            </p>
          )}
          {isSpotify && (
            <div className="rounded-md overflow-hidden">
              <iframe
                src={`https://open.spotify.com/embed/track/${currentVariant.platform_id}?utm_source=generator&theme=0`}
                width="100%"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="border-0"
                title={currentVariant.title}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
