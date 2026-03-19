"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TrackRow } from "@/components/playlist/track-row";
import { VariantDiscoveryPanel } from "@/components/discovery/variant-discovery-panel";

interface Track {
  id: string;
  spotify_track_id: string;
  title: string;
  artist_name: string;
  album_name: string | null;
  album_image_url: string | null;
  duration_ms: number;
  position: number;
}

interface TrackListProps {
  tracks: Track[];
  playlistId: string;
  spotifyPlaylistId: string;
  snapshotId: string;
}

export function TrackList({
  tracks,
  playlistId,
  spotifyPlaylistId,
  snapshotId,
}: TrackListProps) {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const handleSelect = (track: Track) => {
    setSelectedTrack(track);
  };

  const handleClose = () => {
    setSelectedTrack(null);
  };

  const emptyState = tracks.length === 0 && (
    <p className="text-muted-foreground text-center py-12 text-body">
      No tracks found. Sync your playlists to load tracks and start
      discovering variants.
    </p>
  );

  return (
    <>
      {/* Desktop: side-by-side rail + discovery; on mobile: hidden when track selected */}
      <div
        className={cn(
          "flex flex-col lg:flex-row gap-(--space-lg)",
          selectedTrack && "hidden lg:flex"
        )}
      >
        <div
          className={cn(
            "space-y-1",
            selectedTrack
              ? "lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:max-h-[calc(100vh-2rem)] lg:sticky lg:top-4"
              : "flex-1"
          )}
        >
          {tracks.map((track) => (
            <TrackRow
              key={`${track.id}-${track.position}`}
              track={track}
              isSelected={selectedTrack?.id === track.id}
              onSelect={() => handleSelect(track)}
              compact={!!selectedTrack}
            />
          ))}
          {emptyState}
        </div>

        {selectedTrack && (
          <div className="hidden lg:block flex-1 min-w-0">
            <div className="border border-border rounded-2xl p-4 sticky top-4 max-h-[calc(100vh-2rem)] flex flex-col">
              <VariantDiscoveryPanel
                track={selectedTrack}
                playlistId={playlistId}
                spotifyPlaylistId={spotifyPlaylistId}
                snapshotId={snapshotId}
                onClose={handleClose}
                showTrackHeader
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile: dedicated full-screen discovery view */}
      {selectedTrack && (
        <div className="lg:hidden flex flex-col gap-(--space-md)">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="cursor-pointer min-h-11 px-3 self-start"
          >
            &larr; Back to tracks
          </Button>

          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            {selectedTrack.album_image_url ? (
              <Image
                src={selectedTrack.album_image_url}
                alt=""
                width={48}
                height={48}
                sizes="48px"
                className="h-12 w-12 rounded object-cover shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-muted shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-body font-medium truncate">
                {selectedTrack.title}
              </p>
              <p className="text-caption text-muted-foreground truncate">
                {selectedTrack.artist_name}
              </p>
            </div>
          </div>

          <VariantDiscoveryPanel
            track={selectedTrack}
            playlistId={playlistId}
            spotifyPlaylistId={spotifyPlaylistId}
            snapshotId={snapshotId}
            onClose={handleClose}
            showTrackHeader={false}
          />
        </div>
      )}
    </>
  );
}
