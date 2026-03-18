import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrackList } from "@/components/playlist/track-list";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/types/database";

type Track = Database["public"]["Tables"]["spotify_tracks"]["Row"];
type PlaylistTrackLink = Database["public"]["Tables"]["playlist_tracks_link"]["Row"];

interface TrackWithPosition extends Track {
  position: number;
}

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: playlistData } = await supabase
    .from("spotify_playlists")
    .select("*")
    .eq("id", id)
    .single();

  const playlist = playlistData as Database["public"]["Tables"]["spotify_playlists"]["Row"] | null;

  if (!playlist) {
    notFound();
  }

  const { data: linksData } = await supabase
    .from("playlist_tracks_link")
    .select("track_id, position")
    .eq("playlist_id", id)
    .order("position");

  const links = (linksData ?? []) as Pick<PlaylistTrackLink, "track_id" | "position">[];
  const trackIds = links.map((l) => l.track_id);

  let tracks: TrackWithPosition[] = [];

  if (trackIds.length > 0) {
    const { data: trackRows } = await supabase
      .from("spotify_tracks")
      .select("*")
      .in("id", trackIds);

    const trackMap = new Map(
      ((trackRows ?? []) as Track[]).map((t) => [t.id, t])
    );

    tracks = links
      .map((link) => ({
        ...trackMap.get(link.track_id)!,
        position: link.position,
      }))
      .filter((t) => t.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="cursor-pointer">
            &larr; Back
          </Button>
        </Link>
        <div className="flex items-start gap-4">
          {playlist.image_url ? (
            <img
              src={playlist.image_url}
              alt={playlist.name}
              className="h-20 w-20 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <span className="text-3xl text-muted-foreground">♫</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {playlist.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tracks.length} tracks
            </p>
          </div>
        </div>
      </div>

      <TrackList
        tracks={tracks}
        playlistId={id}
        spotifyPlaylistId={playlist.spotify_playlist_id}
        snapshotId={playlist.snapshot_id}
      />
    </div>
  );
}
