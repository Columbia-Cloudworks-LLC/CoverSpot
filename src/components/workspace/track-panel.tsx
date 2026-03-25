"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/lib/types/database";

type Playlist = Database["public"]["Tables"]["spotify_playlists"]["Row"];

export interface TrackWithPosition {
  id: string;
  spotify_track_id: string;
  title: string;
  artist_name: string;
  album_name: string | null;
  album_image_url: string | null;
  duration_ms: number;
  position: number;
}

interface TrackPanelProps {
  playlist: Playlist | null;
  tracks: TrackWithPosition[];
  selectedTrack: TrackWithPosition | null;
  onSelectTrack: (track: TrackWithPosition) => void;
  onDeselectTrack: () => void;
  loading: boolean;
  /** When the right panel is expanded, hide the Album column and reduce row spacing */
  compact?: boolean;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function TrackPanel({
  playlist,
  tracks,
  selectedTrack,
  onSelectTrack,
  onDeselectTrack,
  loading,
  compact = false,
}: TrackPanelProps) {
  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="text-5xl mb-4">♫</div>
        <p className="text-subheading font-semibold">Select a playlist</p>
        <p className="text-body text-muted-foreground mt-1">
          Choose a playlist from the sidebar to view its tracks.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Playlist header with gradient backdrop */}
      <div className="relative shrink-0 px-6 pt-6 pb-4 bg-gradient-to-b from-accent/60 to-background">
        <div className="flex items-end gap-4">
          {playlist.image_url ? (
            <Image
              src={playlist.image_url}
              alt={playlist.name}
              width={compact ? 56 : 80}
              height={compact ? 56 : 80}
              sizes={compact ? "56px" : "80px"}
              priority
              className={cn(
                "rounded-lg object-cover shadow-md shrink-0 transition-all duration-300",
                compact ? "h-14 w-14" : "h-20 w-20"
              )}
            />
          ) : (
            <div
              className={cn(
                "rounded-lg bg-muted flex items-center justify-center shadow-md shrink-0 transition-all duration-300",
                compact ? "h-14 w-14" : "h-20 w-20"
              )}
            >
              <span className="text-2xl text-muted-foreground">♫</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-caption uppercase tracking-widest text-muted-foreground font-medium">
              Playlist
            </p>
            <h1
              className={cn(
                "font-bold leading-tight truncate transition-all duration-300",
                compact ? "text-subheading" : "text-heading"
              )}
            >
              {playlist.name}
            </h1>
            <p className="text-caption text-muted-foreground mt-1">
              {tracks.length} tracks
            </p>
          </div>
        </div>
      </div>

      {/* Column header row */}
      <div
        className={cn(
          "grid items-center gap-3 px-6 py-2 border-b border-border text-caption text-muted-foreground font-medium shrink-0 sticky top-0 bg-background z-10",
          compact
            ? "grid-cols-[2rem_1fr_5rem]"
            : "grid-cols-[2rem_2fr_1.5fr_1fr_4rem]"
        )}
        role="row"
        aria-label="Track list column headers"
      >
        <span className="text-right">#</span>
        <span>Title</span>
        {!compact && <span>Artist</span>}
        {!compact && <span>Album</span>}
        <span className="text-right">
          {/* Clock icon equivalent as text */}
          &#128336;
        </span>
      </div>

      {/* Track rows -- independently scrollable */}
      <div className="flex-1 overflow-y-auto" role="list" aria-label="Tracks">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "grid items-center gap-3 px-6 py-2",
                compact
                  ? "grid-cols-[2rem_1fr_5rem]"
                  : "grid-cols-[2rem_2fr_1.5fr_1fr_4rem]"
              )}
            >
              <Skeleton className="h-4 w-4 ml-auto" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded shrink-0" />
                <div className="space-y-1 min-w-0">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              {!compact && <Skeleton className="h-3 w-24" />}
              {!compact && <Skeleton className="h-3 w-20" />}
              <Skeleton className="h-3 w-8 ml-auto" />
            </div>
          ))}

        {!loading && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <p className="text-body text-muted-foreground">
              No tracks found. Sync your playlists to load tracks.
            </p>
          </div>
        )}

        {!loading &&
          tracks.map((track) => {
            const isSelected = selectedTrack?.id === track.id && selectedTrack?.position === track.position;
            return (
              <button
                key={`${track.id}-${track.position}`}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onDeselectTrack();
                  } else {
                    onSelectTrack(track);
                  }
                }}
                aria-pressed={isSelected}
                className={cn(
                  "w-full grid items-center gap-3 px-6 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset group",
                  compact
                    ? "grid-cols-[2rem_1fr_5rem] py-1.5"
                    : "grid-cols-[2rem_2fr_1.5fr_1fr_4rem] py-2",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                {/* Position number */}
                <span
                  className={cn(
                    "text-caption text-right tabular-nums shrink-0",
                    isSelected ? "text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  {track.position + 1}
                </span>

                {/* Title cell: album art + title + artist (in compact, artist stacks under title) */}
                <div className="flex items-center gap-3 min-w-0">
                  {track.album_image_url ? (
                    <Image
                      src={track.album_image_url}
                      alt=""
                      width={40}
                      height={40}
                      sizes="40px"
                      loading="lazy"
                      className="h-10 w-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-body font-medium truncate leading-tight">
                      {track.title}
                    </p>
                    {/* In compact mode, artist shows under the title */}
                    {compact && (
                      <p
                        className={cn(
                          "text-caption truncate leading-tight mt-0.5",
                          isSelected ? "text-accent-foreground/75" : "text-muted-foreground"
                        )}
                      >
                        {track.artist_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Artist column (full mode only) */}
                {!compact && (
                  <span
                    className={cn(
                      "text-body truncate",
                      isSelected ? "text-accent-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {track.artist_name}
                  </span>
                )}

                {/* Album column (full mode only) */}
                {!compact && (
                  <span
                    className={cn(
                      "text-body truncate",
                      isSelected ? "text-accent-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {track.album_name ?? "—"}
                  </span>
                )}

                {/* Duration */}
                <span
                  className={cn(
                    "text-caption text-right tabular-nums shrink-0",
                    isSelected ? "text-accent-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {formatDuration(track.duration_ms)}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
