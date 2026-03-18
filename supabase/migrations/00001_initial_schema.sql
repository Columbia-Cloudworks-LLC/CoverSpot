-- CoverSpot Phase 1 MVP Schema
-- Extensions
create extension if not exists "pg_cron" with schema pg_catalog;
create extension if not exists "pg_net" with schema extensions;

-- =============================================================================
-- TABLES
-- =============================================================================

-- users: extends auth.users with Spotify-specific fields
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  spotify_id varchar(255) unique not null,
  email varchar(255) not null,
  spotify_access_token text not null,
  spotify_refresh_token text not null,
  token_expires_at timestamptz not null,
  premium_status boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- spotify_playlists: cached playlist metadata
create table public.spotify_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  spotify_playlist_id varchar(255) not null,
  name varchar(255) not null,
  description text,
  image_url text,
  is_collaborative boolean default false,
  snapshot_id varchar(255) not null,
  total_tracks integer default 0,
  last_synced_at timestamptz default now(),
  unique (user_id, spotify_playlist_id)
);

-- spotify_tracks: global deduplicated track cache
create table public.spotify_tracks (
  id uuid primary key default gen_random_uuid(),
  spotify_track_id varchar(255) unique not null,
  title varchar(255) not null,
  artist_name varchar(255) not null,
  album_name varchar(255),
  album_image_url text,
  duration_ms integer not null,
  preview_url text,
  raw_metadata jsonb
);

-- playlist_tracks_link: junction table preserving track order
create table public.playlist_tracks_link (
  playlist_id uuid not null references public.spotify_playlists(id) on delete cascade,
  track_id uuid not null references public.spotify_tracks(id) on delete cascade,
  position integer not null,
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id, position)
);

-- track_variants: variant relationship engine
create table public.track_variants (
  id uuid primary key default gen_random_uuid(),
  original_track_id uuid not null references public.spotify_tracks(id) on delete cascade,
  platform varchar(50) not null check (platform in ('spotify', 'youtube')),
  platform_id varchar(255) unique not null,
  variant_type varchar(50) not null,
  title varchar(500) not null,
  artist_or_channel varchar(255) not null,
  thumbnail_url text,
  duration_ms integer,
  embeddable boolean default true,
  status varchar(20) default 'active' check (status in ('active', 'review', 'rejected')),
  rejection_reason varchar(255),
  relevance_score numeric(5,2),
  flag_count integer default 0,
  discovered_at timestamptz default now()
);

create index idx_variants_lookup on public.track_variants(original_track_id, variant_type);
create index idx_variants_platform on public.track_variants(platform, platform_id);

-- mutation_jobs: audit trail for playlist add/swap operations
create table public.mutation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  playlist_id uuid not null references public.spotify_playlists(id) on delete cascade,
  mutation_type varchar(20) not null check (mutation_type in ('add', 'swap')),
  variant_id uuid references public.track_variants(id) on delete set null,
  original_track_id uuid references public.spotify_tracks(id) on delete set null,
  target_position integer,
  snapshot_id_before varchar(255),
  snapshot_id_after varchar(255),
  status varchar(20) default 'pending' check (status in ('pending', 'success', 'conflict', 'failed')),
  error_message text,
  retry_count integer default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- sync_jobs: playlist sync execution tracking
create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status varchar(20) default 'pending' check (status in ('pending', 'running', 'success', 'failed')),
  playlists_synced integer default 0,
  tracks_synced integer default 0,
  error_message text,
  retry_count integer default 0,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.users enable row level security;
alter table public.spotify_playlists enable row level security;
alter table public.spotify_tracks enable row level security;
alter table public.playlist_tracks_link enable row level security;
alter table public.track_variants enable row level security;
alter table public.mutation_jobs enable row level security;
alter table public.sync_jobs enable row level security;

-- users: own row only
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- spotify_playlists: read own playlists
create policy "playlists_select_own" on public.spotify_playlists
  for select using (user_id = auth.uid());

-- playlist_tracks_link: read via playlist ownership
create policy "playlist_tracks_select_own" on public.playlist_tracks_link
  for select using (
    exists (
      select 1 from public.spotify_playlists
      where spotify_playlists.id = playlist_tracks_link.playlist_id
        and spotify_playlists.user_id = auth.uid()
    )
  );

-- spotify_tracks: read for any authenticated user (global cache)
create policy "tracks_select_authenticated" on public.spotify_tracks
  for select using (auth.role() = 'authenticated');

-- track_variants: read for any authenticated user (global cache)
create policy "variants_select_authenticated" on public.track_variants
  for select using (auth.role() = 'authenticated');

-- mutation_jobs: read own jobs
create policy "mutation_jobs_select_own" on public.mutation_jobs
  for select using (user_id = auth.uid());

-- sync_jobs: read own jobs
create policy "sync_jobs_select_own" on public.sync_jobs
  for select using (user_id = auth.uid());

-- =============================================================================
-- AUTO-CREATE TRIGGER: create public.users row on auth.users insert
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, spotify_id, email, spotify_access_token, spotify_refresh_token, token_expires_at, premium_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'provider_id', ''),
    coalesce(new.email, ''),
    '',
    '',
    now(),
    coalesce((new.raw_user_meta_data ->> 'product') = 'premium', false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- UPDATED_AT TRIGGER for users table
-- =============================================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at();
