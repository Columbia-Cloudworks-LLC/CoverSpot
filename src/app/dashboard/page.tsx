import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LayoutShell } from "@/components/workspace/layout-shell";
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

  return <LayoutShell playlists={playlists} />;
}
