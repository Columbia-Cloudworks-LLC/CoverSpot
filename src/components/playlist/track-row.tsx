import Image from "next/image";
import { cn } from "@/lib/utils";

interface Track {
  id: string;
  title: string;
  artist_name: string;
  album_image_url: string | null;
  duration_ms: number;
  position: number;
}

interface TrackRowProps {
  track: Track;
  isSelected: boolean;
  onSelect: () => void;
  compact?: boolean;
}

export function TrackRow({ track, isSelected, onSelect, compact = false }: TrackRowProps) {
  const minutes = Math.floor(track.duration_ms / 60000);
  const seconds = Math.floor((track.duration_ms % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center rounded-md text-left transition-colors cursor-pointer min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        compact ? "gap-2 px-2 py-2" : "gap-3 px-3 py-3",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      )}
    >
      {!compact && (
        <span className="w-6 text-caption text-foreground/70 text-right shrink-0">
          {track.position + 1}
        </span>
      )}
      {track.album_image_url ? (
        <Image
          src={track.album_image_url}
          alt=""
          width={compact ? 32 : 40}
          height={compact ? 32 : 40}
          sizes={compact ? "32px" : "40px"}
          loading="lazy"
          className={cn(
            "rounded object-cover shrink-0",
            compact ? "h-8 w-8" : "h-10 w-10"
          )}
        />
      ) : (
        <div className={cn(
          "rounded bg-muted shrink-0",
          compact ? "h-8 w-8" : "h-10 w-10"
        )} />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium truncate",
          compact ? "text-caption" : "text-body"
        )}>
          {track.title}
        </p>
        {!compact && (
          <p className="text-caption text-foreground/75 truncate">
            {track.artist_name}
          </p>
        )}
      </div>
      {!compact && (
        <span className="text-caption text-foreground/75 shrink-0">
          {minutes}:{seconds}
        </span>
      )}
    </button>
  );
}
