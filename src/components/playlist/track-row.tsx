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
}

export function TrackRow({ track, isSelected, onSelect }: TrackRowProps) {
  const minutes = Math.floor(track.duration_ms / 60000);
  const seconds = Math.floor((track.duration_ms % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors cursor-pointer",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      )}
    >
      <span className="w-6 text-xs text-muted-foreground text-right shrink-0">
        {track.position + 1}
      </span>
      {track.album_image_url ? (
        <img
          src={track.album_image_url}
          alt=""
          className="h-10 w-10 rounded object-cover shrink-0"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-muted shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {track.artist_name}
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {minutes}:{seconds}
      </span>
    </button>
  );
}
