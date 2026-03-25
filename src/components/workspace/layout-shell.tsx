"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PlayerProvider } from "@/lib/player-context";
import { PlaylistSidebar } from "@/components/workspace/playlist-sidebar";
import { TrackPanel, type TrackWithPosition } from "@/components/workspace/track-panel";
import { VariantDiscoveryPanel } from "@/components/discovery/variant-discovery-panel";
import { MiniPlayer } from "@/components/playback/mini-player";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Music2 } from "lucide-react";
import type { Database } from "@/lib/types/database";

type Playlist = Database["public"]["Tables"]["spotify_playlists"]["Row"];
type Track = Database["public"]["Tables"]["spotify_tracks"]["Row"];
type PlaylistTrackLink = Database["public"]["Tables"]["playlist_tracks_link"]["Row"];

/** Mobile progressive-disclosure view state */
type MobileView = "playlists" | "tracks" | "results";

interface LayoutShellProps {
  playlists: Playlist[];
}

export function LayoutShell({ playlists }: LayoutShellProps) {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    playlists[0] ?? null
  );
  const [selectedTrack, setSelectedTrack] = useState<TrackWithPosition | null>(null);
  const [tracks, setTracks] = useState<TrackWithPosition[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>(
    playlists.length > 0 ? "tracks" : "playlists"
  );
  /** Track IDs the user has searched alternatives for this session */
  const [searchedTrackIds, setSearchedTrackIds] = useState<Set<string>>(new Set());

  const panelExpanded = selectedTrack !== null;

  const handleTrackSearched = useCallback((trackId: string) => {
    setSearchedTrackIds((prev) => {
      if (prev.has(trackId)) return prev;
      const next = new Set(prev);
      next.add(trackId);
      return next;
    });
  }, []);

  /** Fetch tracks for a given playlist */
  const loadTracks = useCallback(async (playlist: Playlist) => {
    setTracksLoading(true);
    setTracks([]);
    setSelectedTrack(null);

    try {
      const supabase = createClient();

      const { data: linksData } = await supabase
        .from("playlist_tracks_link")
        .select("track_id, position")
        .eq("playlist_id", playlist.id)
        .order("position");

      const links = (linksData ?? []) as Pick<PlaylistTrackLink, "track_id" | "position">[];
      const trackIds = links.map((l) => l.track_id);

      if (trackIds.length === 0) {
        setTracksLoading(false);
        return;
      }

      const { data: trackRows } = await supabase
        .from("spotify_tracks")
        .select("*")
        .in("id", trackIds);

      const trackMap = new Map(
        ((trackRows ?? []) as Track[]).map((t) => [t.id, t])
      );

      const ordered: TrackWithPosition[] = links
        .map((link) => {
          const track = trackMap.get(link.track_id);
          if (!track) return null;
          return {
            id: track.id,
            spotify_track_id: track.spotify_track_id,
            title: track.title,
            artist_name: track.artist_name,
            album_name: track.album_name,
            album_image_url: track.album_image_url,
            duration_ms: track.duration_ms,
            position: link.position,
          };
        })
        .filter((t): t is TrackWithPosition => t !== null);

      setTracks(ordered);
    } catch (err) {
      console.error("Failed to load tracks:", err);
    } finally {
      setTracksLoading(false);
    }
  }, []);

  /** Auto-load tracks for the first playlist on mount */
  useEffect(() => {
    if (selectedPlaylist) {
      void loadTracks(selectedPlaylist);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run only on mount
  }, []);

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setMobileView("tracks");
    void loadTracks(playlist);
  };

  const handleSelectTrack = (track: TrackWithPosition) => {
    setSelectedTrack(track);
    setMobileView("results");
  };

  const handleDeselectTrack = () => {
    setSelectedTrack(null);
    setMobileView("tracks");
  };

  /** Collapsed sidebar is icon-only at 4rem; expanded at 16rem */
  const gridTemplateColumns = panelExpanded
    ? "4rem minmax(0, 1fr) 3fr"
    : "16rem 1fr 20rem";

  return (
    <PlayerProvider>
      <div className="flex flex-col h-full">
        {/* ── Desktop (lg+): 3-column animated CSS Grid ── */}
        <div
          className="hidden lg:grid flex-1 min-h-0 workspace-grid"
          style={{ gridTemplateColumns }}
        >
          {/* Left: Playlist sidebar */}
          <PlaylistSidebar
            playlists={playlists}
            selectedPlaylistId={selectedPlaylist?.id ?? null}
            onSelectPlaylist={handleSelectPlaylist}
            compact={panelExpanded}
          />

          {/* Center: Track list */}
          <TrackPanel
            playlist={selectedPlaylist}
            tracks={tracks}
            selectedTrack={selectedTrack}
            onSelectTrack={handleSelectTrack}
            onDeselectTrack={handleDeselectTrack}
            loading={tracksLoading}
            compact={panelExpanded}
            searchedTrackIds={searchedTrackIds}
          />

          {/* Right: Discovery panel or placeholder */}
          <div className="flex flex-col border-l border-border overflow-hidden h-full bg-background">
            {selectedTrack && selectedPlaylist ? (
              <div className="flex flex-col h-full overflow-hidden p-4">
                <VariantDiscoveryPanel
                  track={{
                    id: selectedTrack.id,
                    title: selectedTrack.title,
                    artist_name: selectedTrack.artist_name,
                    position: selectedTrack.position,
                  }}
                  playlistId={selectedPlaylist.id}
                  spotifyPlaylistId={selectedPlaylist.spotify_playlist_id}
                  snapshotId={selectedPlaylist.snapshot_id}
                  onClose={handleDeselectTrack}
                  onSearched={handleTrackSearched}
                  showTrackHeader
                />
              </div>
            ) : (
              <RightPanelPlaceholder />
            )}
          </div>
        </div>

        {/* ── Mobile (below lg): Progressive disclosure, one panel at a time ── */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Mobile: Playlists view */}
          {mobileView === "playlists" && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 border-b border-border shrink-0">
                <h1 className="text-subheading font-semibold">Your Library</h1>
              </div>
              <div className="flex-1 overflow-hidden">
                <PlaylistSidebar
                  playlists={playlists}
                  selectedPlaylistId={selectedPlaylist?.id ?? null}
                  onSelectPlaylist={handleSelectPlaylist}
                  compact={false}
                />
              </div>
            </div>
          )}

          {/* Mobile: Tracks view */}
          {mobileView === "tracks" && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-4 py-2 border-b border-border shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileView("playlists")}
                  className="cursor-pointer min-h-11 -ml-2 gap-1.5"
                >
                  <ChevronLeft className="size-4" />
                  Library
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TrackPanel
                  playlist={selectedPlaylist}
                  tracks={tracks}
                  selectedTrack={selectedTrack}
                  onSelectTrack={handleSelectTrack}
                  onDeselectTrack={handleDeselectTrack}
                  loading={tracksLoading}
                  compact={false}
                  searchedTrackIds={searchedTrackIds}
                />
              </div>
            </div>
          )}

          {/* Mobile: Discovery results view */}
          {mobileView === "results" && selectedTrack && selectedPlaylist && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-4 py-2 border-b border-border shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectTrack}
                  className="cursor-pointer min-h-11 -ml-2 gap-1.5"
                >
                  <ChevronLeft className="size-4" />
                  {selectedPlaylist.name}
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <VariantDiscoveryPanel
                  track={{
                    id: selectedTrack.id,
                    title: selectedTrack.title,
                    artist_name: selectedTrack.artist_name,
                    position: selectedTrack.position,
                  }}
                  playlistId={selectedPlaylist.id}
                  spotifyPlaylistId={selectedPlaylist.spotify_playlist_id}
                  snapshotId={selectedPlaylist.snapshot_id}
                  onClose={handleDeselectTrack}
                  onSearched={handleTrackSearched}
                  showTrackHeader
                />
              </div>
            </div>
          )}
        </div>

        {/* Persistent mini-player — sits below all columns, above nothing */}
        <MiniPlayer />
      </div>
    </PlayerProvider>
  );
}

/** Shown in the right column when no track is selected */
function RightPanelPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-2">
        <Music2 className="size-7 text-muted-foreground" />
      </div>
      <p className="text-subheading font-semibold">Find alternate versions</p>
      <p className="text-body text-muted-foreground max-w-xs">
        Select a track to discover covers, live versions, acoustic renditions, and remixes across Spotify and YouTube.
      </p>
    </div>
  );
}
