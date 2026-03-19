import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SyncButton } from "@/components/playlist/sync-button";
import { PlaylistCard } from "@/components/playlist/playlist-card";
import type { Database } from "@/lib/types/database";

type Playlist = Database["public"]["Tables"]["spotify_playlists"]["Row"];

export const metadata: Metadata = {
  title: "Your Playlists",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("spotify_playlists")
    .select("*")
    .eq("user_id", user!.id)
    .order("last_synced_at", { ascending: false });

  const playlists = (data ?? []) as Playlist[];
  const [featuredPlaylist, ...otherPlaylists] = playlists;

  return (
    <div className="space-y-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-heading">Your Playlists</h1>
          <p className="text-meta text-muted-foreground mt-1">
            {playlists.length > 0
              ? "Tap a playlist to discover alternate versions of its tracks"
              : "Sync your Spotify playlists to get started"}
          </p>
        </div>
        <div className="shrink-0">
          <SyncButton />
        </div>
      </div>

      {playlists.length > 0 ? (
        <div className="space-y-md">
          {featuredPlaylist && (
            <PlaylistCard
              key={featuredPlaylist.id}
              id={featuredPlaylist.id}
              name={featuredPlaylist.name}
              totalTracks={featuredPlaylist.total_tracks}
              imageUrl={featuredPlaylist.image_url}
              lastSyncedAt={featuredPlaylist.last_synced_at}
              isCollaborative={featuredPlaylist.is_collaborative}
              featured
            />
          )}

          {otherPlaylists.length > 0 && (
            <div className="divide-y divide-border/40">
              {otherPlaylists.map((pl) => (
                <PlaylistCard
                  key={pl.id}
                  id={pl.id}
                  name={pl.name}
                  totalTracks={pl.total_tracks}
                  imageUrl={pl.image_url}
                  lastSyncedAt={pl.last_synced_at}
                  isCollaborative={pl.is_collaborative}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="text-6xl mb-4">♫</div>
          <h2 className="text-subheading">No playlists yet</h2>
          <p className="text-body text-muted-foreground max-w-sm mb-2">
            Sync your Spotify library to load playlists and start finding
            alternate versions of your tracks.
          </p>
          <p className="text-caption text-foreground/75 max-w-sm">
            Your playlists import first, then tracks are available to explore in a few seconds.
          </p>
          <SyncButton />
        </div>
      )}
    </div>
  );
}
