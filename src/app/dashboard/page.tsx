import { createClient } from "@/lib/supabase/server";
import { SyncButton } from "@/components/playlist/sync-button";
import { PlaylistCard } from "@/components/playlist/playlist-card";
import type { Database } from "@/lib/types/database";

type Playlist = Database["public"]["Tables"]["spotify_playlists"]["Row"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("spotify_playlists")
    .select("*")
    .eq("user_id", user!.id)
    .order("name");

  const playlists = (data ?? []) as Playlist[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Playlists</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {playlists.length > 0
              ? `${playlists.length} playlists synced`
              : "Sync your Spotify playlists to get started"}
          </p>
        </div>
        <SyncButton />
      </div>

      {playlists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((pl) => (
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
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">♫</div>
          <h2 className="text-xl font-semibold mb-2">No playlists yet</h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            Click &quot;Sync Playlists&quot; to import your Spotify playlists
            and start discovering variants.
          </p>
          <SyncButton />
        </div>
      )}
    </div>
  );
}
