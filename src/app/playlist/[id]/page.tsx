import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("spotify_playlists")
    .select("name")
    .eq("id", id)
    .single();
  const row = data as Database["public"]["Tables"]["spotify_playlists"]["Row"] | null;
  return { title: row?.name ?? "Playlist" };
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
    <div className="space-y-xl">
      <div className="space-y-md">
        <Button
          render={<Link href="/dashboard" />}
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="cursor-pointer min-h-11 px-3"
        >
          &larr; Back
        </Button>
        <div className="flex items-start gap-(--space-md)">
          {playlist.image_url ? (
            <Image
              src={playlist.image_url}
              alt={playlist.name}
              width={80}
              height={80}
              sizes="(max-width: 640px) 56px, 80px"
              priority
              className="h-14 w-14 sm:h-20 sm:w-20 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <span className="text-3xl text-muted-foreground">♫</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-heading line-clamp-2">
              {playlist.name}
            </h1>
            <p className="text-meta text-muted-foreground mt-1">
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
