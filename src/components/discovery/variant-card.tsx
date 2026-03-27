"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, ExternalLink, Flag, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MutationButtons } from "@/components/mutation/mutation-buttons";
import { usePlayer, type PlayableVariant } from "@/lib/player-context";
import { createClient, getAccessToken } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Variant extends PlayableVariant {
  variant_type: string;
  status: string;
  rejection_reason: string | null;
  relevance_score?: number | null;
  flag_count?: number;
}

interface VariantCardProps {
  variant: Variant;
  playlistId: string;
  spotifyPlaylistId: string;
  snapshotId: string;
  originalTrackPosition: number;
  isRejected?: boolean;
}

const FLAG_REASONS = [
  "Not a real cover",
  "Wrong song",
  "Spam/inappropriate",
  "Duplicate",
  "Other",
] as const;

const REJECTION_LABELS: Record<string, string> = {
  "Karaoke track detected": "This is a karaoke/backing track, not a performed version",
  "Instrumental-only track": "Instrumental track without a cover performance",
  "Tutorial/lesson content": "This is an instructional video, not a performance",
  "Duration far outside expected range": "Track length is too different from the original",
  "Rejected by moderator": "Removed by a moderator after review",
};

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
  const [flagged, setFlagged] = useState(false);
  const [flagging, setFlagging] = useState(false);

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

  const handleFlag = async (reason: string) => {
    setFlagging(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error("Session expired. Please log in again.");
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.functions.invoke("flag-variant", {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { variant_id: variant.id, reason },
      });

      if (error) {
        toast.error("Failed to submit flag");
        return;
      }
      setFlagged(true);
      toast.success("Variant flagged for review");
    } catch {
      toast.error("Failed to submit flag");
    } finally {
      setFlagging(false);
    }
  };

  const scorePercent =
    variant.relevance_score != null
      ? Math.round(variant.relevance_score * 100)
      : null;

  const scoreColor =
    scorePercent != null
      ? scorePercent >= 72
        ? "text-emerald-600 dark:text-emerald-400"
        : scorePercent >= 45
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground"
      : null;

  const friendlyRejection =
    variant.rejection_reason && REJECTION_LABELS[variant.rejection_reason]
      ? REJECTION_LABELS[variant.rejection_reason]
      : variant.rejection_reason;

  const isUnderReview = variant.status === "review";

  return (
    <div
      className={cn(
        "rounded-lg border border-border p-2 flex items-center gap-2.5 transition-colors",
        isPlaying && "border-primary/40 bg-primary/5",
        isRejected && "opacity-60"
      )}
    >
      {/* Thumbnail */}
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
            <span className="text-muted-foreground text-xs">&#9835;</span>
          </div>
        )}
        {!isRejected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
            <Play className="size-4 text-white fill-white" />
          </div>
        )}
      </button>

      {/* Metadata */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-body font-medium truncate leading-tight">
            {variant.title}
          </p>
          {isUnderReview && (
            <Badge
              variant="outline"
              className="shrink-0 text-[10px] px-1 py-0 leading-tight h-4 border-amber-500 text-amber-600 dark:text-amber-400"
            >
              Under review
            </Badge>
          )}
        </div>
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
        {isRejected && friendlyRejection && (
          <p className="text-caption text-destructive mt-0.5 truncate">
            {friendlyRejection}
          </p>
        )}
      </div>

      {/* Confidence score badge */}
      {scorePercent != null && !isRejected && (
        <span
          className={cn(
            "text-caption tabular-nums shrink-0 font-medium",
            scoreColor
          )}
          title="Relevance confidence — how closely this variant matches the original track"
        >
          {scorePercent}%
        </span>
      )}

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

          {/* Flag dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={flagged || flagging}
              aria-label="Flag this variant"
              className={cn(
                "inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors cursor-pointer",
                flagged
                  ? "text-destructive cursor-default"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {flagging ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Flag
                  className={cn("size-3.5", flagged && "fill-destructive")}
                />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {FLAG_REASONS.map((reason) => (
                <DropdownMenuItem
                  key={reason}
                  onClick={() => handleFlag(reason)}
                  className="text-caption cursor-pointer"
                >
                  {reason}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
