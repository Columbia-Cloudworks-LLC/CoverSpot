export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          spotify_id: string;
          email: string;
          spotify_access_token: string;
          spotify_refresh_token: string;
          token_expires_at: string;
          premium_status: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          spotify_id: string;
          email: string;
          spotify_access_token: string;
          spotify_refresh_token: string;
          token_expires_at: string;
          premium_status?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          spotify_id?: string;
          email?: string;
          spotify_access_token?: string;
          spotify_refresh_token?: string;
          token_expires_at?: string;
          premium_status?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      spotify_playlists: {
        Row: {
          id: string;
          user_id: string;
          spotify_playlist_id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          is_collaborative: boolean;
          snapshot_id: string;
          total_tracks: number;
          last_synced_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          spotify_playlist_id: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          is_collaborative?: boolean;
          snapshot_id: string;
          total_tracks?: number;
          last_synced_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          spotify_playlist_id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          is_collaborative?: boolean;
          snapshot_id?: string;
          total_tracks?: number;
          last_synced_at?: string;
        };
      };
      spotify_tracks: {
        Row: {
          id: string;
          spotify_track_id: string;
          title: string;
          artist_name: string;
          album_name: string | null;
          album_image_url: string | null;
          duration_ms: number;
          preview_url: string | null;
          raw_metadata: Json | null;
        };
        Insert: {
          id?: string;
          spotify_track_id: string;
          title: string;
          artist_name: string;
          album_name?: string | null;
          album_image_url?: string | null;
          duration_ms: number;
          preview_url?: string | null;
          raw_metadata?: Json | null;
        };
        Update: {
          id?: string;
          spotify_track_id?: string;
          title?: string;
          artist_name?: string;
          album_name?: string | null;
          album_image_url?: string | null;
          duration_ms?: number;
          preview_url?: string | null;
          raw_metadata?: Json | null;
        };
      };
      playlist_tracks_link: {
        Row: {
          playlist_id: string;
          track_id: string;
          position: number;
          added_at: string;
        };
        Insert: {
          playlist_id: string;
          track_id: string;
          position: number;
          added_at?: string;
        };
        Update: {
          playlist_id?: string;
          track_id?: string;
          position?: number;
          added_at?: string;
        };
      };
      track_variants: {
        Row: {
          id: string;
          original_track_id: string;
          platform: "spotify" | "youtube";
          platform_id: string;
          variant_type: string;
          title: string;
          artist_or_channel: string;
          thumbnail_url: string | null;
          duration_ms: number | null;
          embeddable: boolean;
          status: "active" | "review" | "rejected";
          rejection_reason: string | null;
          relevance_score: number | null;
          flag_count: number;
          discovered_at: string;
        };
        Insert: {
          id?: string;
          original_track_id: string;
          platform: "spotify" | "youtube";
          platform_id: string;
          variant_type: string;
          title: string;
          artist_or_channel: string;
          thumbnail_url?: string | null;
          duration_ms?: number | null;
          embeddable?: boolean;
          status?: "active" | "review" | "rejected";
          rejection_reason?: string | null;
          relevance_score?: number | null;
          flag_count?: number;
          discovered_at?: string;
        };
        Update: {
          id?: string;
          original_track_id?: string;
          platform?: "spotify" | "youtube";
          platform_id?: string;
          variant_type?: string;
          title?: string;
          artist_or_channel?: string;
          thumbnail_url?: string | null;
          duration_ms?: number | null;
          embeddable?: boolean;
          status?: "active" | "review" | "rejected";
          rejection_reason?: string | null;
          relevance_score?: number | null;
          flag_count?: number;
          discovered_at?: string;
        };
      };
      mutation_jobs: {
        Row: {
          id: string;
          user_id: string;
          playlist_id: string;
          mutation_type: "add" | "swap";
          variant_id: string | null;
          original_track_id: string | null;
          target_position: number | null;
          snapshot_id_before: string | null;
          snapshot_id_after: string | null;
          status: "pending" | "success" | "conflict" | "failed";
          error_message: string | null;
          retry_count: number;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          playlist_id: string;
          mutation_type: "add" | "swap";
          variant_id?: string | null;
          original_track_id?: string | null;
          target_position?: number | null;
          snapshot_id_before?: string | null;
          snapshot_id_after?: string | null;
          status?: "pending" | "success" | "conflict" | "failed";
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          playlist_id?: string;
          mutation_type?: "add" | "swap";
          variant_id?: string | null;
          original_track_id?: string | null;
          target_position?: number | null;
          snapshot_id_before?: string | null;
          snapshot_id_after?: string | null;
          status?: "pending" | "success" | "conflict" | "failed";
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      sync_jobs: {
        Row: {
          id: string;
          user_id: string;
          status: "pending" | "running" | "success" | "failed";
          playlists_synced: number;
          tracks_synced: number;
          error_message: string | null;
          retry_count: number;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: "pending" | "running" | "success" | "failed";
          playlists_synced?: number;
          tracks_synced?: number;
          error_message?: string | null;
          retry_count?: number;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: "pending" | "running" | "success" | "failed";
          playlists_synced?: number;
          tracks_synced?: number;
          error_message?: string | null;
          retry_count?: number;
          started_at?: string;
          completed_at?: string | null;
        };
      };
    };
  };
}
