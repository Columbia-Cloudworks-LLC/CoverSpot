"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { SyncButton } from "@/components/playlist/sync-button";
import { LibraryBig } from "lucide-react";
import type { Database } from "@/lib/types/database";

type Playlist = Database["public"]["Tables"]["spotify_playlists"]["Row"];

interface PlaylistSidebarProps {
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlist: Playlist) => void;
  /** When the right panel is expanded, sidebar compresses: hides track counts, truncates titles more aggressively */
  compact?: boolean;
}

export function PlaylistSidebar({
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  compact = false,
}: PlaylistSidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar overflow-hidden h-full",
        compact ? "min-w-0" : ""
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3 border-b border-border shrink-0",
          compact ? "justify-center px-2" : "justify-between"
        )}
      >
        {!compact && (
          <div className="flex items-center gap-2 min-w-0">
            <LibraryBig className="size-4 text-muted-foreground shrink-0" />
            <span className="text-meta font-semibold truncate">Your Library</span>
          </div>
        )}
        {compact && (
          <LibraryBig className="size-4 text-muted-foreground shrink-0" />
        )}
        <div className={cn("shrink-0", compact && "hidden")}>
          <SyncButton />
        </div>
      </div>

      {/* Playlist list */}
      <nav className="flex-1 overflow-y-auto py-1" aria-label="Playlists">
        {playlists.length === 0 && (
          <p className="text-caption text-muted-foreground text-center py-8 px-4">
            No playlists. Sync to load.
          </p>
        )}
        {playlists.map((playlist) => {
          const isSelected = playlist.id === selectedPlaylistId;
          return (
            <button
              key={playlist.id}
              type="button"
              onClick={() => onSelectPlaylist(playlist)}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-sidebar-foreground"
              )}
            >
              {/* Album art */}
              {playlist.image_url ? (
                <Image
                  src={playlist.image_url}
                  alt=""
                  width={40}
                  height={40}
                  sizes="40px"
                  loading="lazy"
                  className="h-10 w-10 rounded object-cover shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                  <span className="text-base text-muted-foreground">♫</span>
                </div>
              )}

              {/* Name + track count -- hidden in compact mode */}
              {!compact && (
                <div className="min-w-0 flex-1">
                  <p className="text-meta font-medium truncate leading-tight">
                    {playlist.name}
                  </p>
                  <p className="text-caption text-muted-foreground leading-tight mt-0.5">
                    {playlist.total_tracks} tracks
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
