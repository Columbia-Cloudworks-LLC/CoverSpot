# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (v0.0.1)

- Initial changelog tracking added.

## [0.0.1] - 2026-03-18

### Added

- MVP end-to-end flow: Spotify login, playlist sync, variant discovery, preview, and playlist mutation.
- Spotify OAuth authentication via Supabase Auth, including callback handling and user metadata upsert.
- Dashboard and playlist views for cached playlist and track exploration.
- Variant discovery pipeline for `cover`, `live`, `acoustic`, `remix`, and custom queries.
- Cache-first lookup strategy using local `track_variants` before external API discovery.
- Spotify + YouTube variant candidate sourcing and filtering.
- In-app preview support for Spotify and YouTube candidates.
- Playlist mutation operations:
  - add selected variant to playlist
  - swap selected variant into original track position
  - snapshot conflict handling and retry flow
- Supabase database schema and initial migration for:
  - `users`
  - `spotify_playlists`
  - `spotify_tracks`
  - `playlist_tracks_link`
  - `track_variants`
  - `mutation_jobs`
  - `sync_jobs`
- Row Level Security (RLS) policies for user-scoped and global read-only datasets.
- Supabase Edge Functions:
  - `refresh-spotify-token`
  - `sync-playlists`
  - `discover-variants`
  - `mutate-playlist`
- Shared Edge Function utilities for CORS handling, Spotify API wrappers/retry, and authenticated Supabase admin access.
- PowerShell development workflow scripts and wrappers:
  - `scripts/dev-start.ps1`
  - `scripts/dev-stop.ps1`
  - `scripts/check-syntax.ps1`
  - `dev-start.bat`
  - `dev-stop.bat`
- Environment templates:
  - `.env.example`
  - `supabase/functions/.env.example`
- Initial product, phase, and environment setup documentation set.
