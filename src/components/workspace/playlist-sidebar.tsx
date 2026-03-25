"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { SyncButton } from "@/components/playlist/sync-button";
import { LibraryBig, RefreshCw } from "lucide-react";
import type { Database } from "@/lib/types/database";

type Playlist = Database["public"]["Tables"]["spotify_playlists"]["Row"];

interface PlaylistSidebarProps {
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlist: Playlist) => void;
  /** When the right panel is expanded, sidebar compresses to icon-only thumbnails */
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
          "flex items-center gap-2 px-3 py-3 border-b border-border shrink-0",
          compact ? "justify-center flex-col gap-2" : "justify-between px-4"
        )}
      >
        {!compact && (
          <div className="flex items-center gap-2 min-w-0">
            <LibraryBig className="size-4 text-muted-foreground shrink-0" />
            <span className="text-meta font-semibold truncate">Your Library</span>
          </div>
        )}
        {compact && (
          <LibraryBig
            className="size-4 text-muted-foreground shrink-0"
            aria-label="Your Library"
          />
        )}

        {/* Sync: full button when expanded, icon-only with tooltip when compact */}
        <div className={cn("shrink-0", compact && "w-full flex justify-center")}>
          {compact ? (
            <CompactSyncButton />
          ) : (
            <SyncButton />
          )}
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
              title={compact ? playlist.name : undefined}
              className={cn(
                "w-full flex items-center gap-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                compact ? "justify-center px-2 py-2" : "px-3 py-2",
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
                <div
                  className={cn(
                    "rounded bg-muted flex items-center justify-center shrink-0",
                    compact ? "h-8 w-8" : "h-10 w-10"
                  )}
                >
                  <span className="text-sm text-muted-foreground">♫</span>
                </div>
              )}

              {/* Name + track count — hidden in compact mode */}
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

/** Icon-only sync button for the collapsed sidebar state */
function CompactSyncButton() {
  // We can't easily pass the syncing state up from SyncButton so we render a
  // simplified version that delegates to the same edge function. Rather than
  // duplicating logic, we forward clicks to a hidden SyncButton wrapper.
  return (
    <div className="relative">
      <div
        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
        title="Sync Playlists"
        aria-label="Sync Playlists"
      >
        <RefreshCw className="size-3.5" />
      </div>
      {/* Invisible full SyncButton sits on top to handle the click */}
      <div className="absolute inset-0 opacity-0 overflow-hidden">
        <SyncButton />
      </div>
    </div>
  );
}
