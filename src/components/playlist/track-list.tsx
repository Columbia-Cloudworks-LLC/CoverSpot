"use client";

import { useState } from "react";
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

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-1">
        {tracks.map((track) => (
          <TrackRow
            key={`${track.id}-${track.position}`}
            track={track}
            isSelected={selectedTrack?.id === track.id}
            onSelect={() => setSelectedTrack(track)}
          />
        ))}
        {tracks.length === 0 && (
          <p className="text-muted-foreground text-center py-12">
            No tracks found. Try syncing your playlists.
          </p>
        )}
      </div>

      {selectedTrack && (
        <div className="lg:w-[420px] shrink-0">
          <VariantDiscoveryPanel
            track={selectedTrack}
            playlistId={playlistId}
            spotifyPlaylistId={spotifyPlaylistId}
            snapshotId={snapshotId}
            onClose={() => setSelectedTrack(null)}
          />
        </div>
      )}
    </div>
  );
}
