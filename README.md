# CoverSpot

CoverSpot is a web app that connects to a user's Spotify account, syncs playlists, and helps discover alternate versions of songs (cover, live, acoustic, remix, or custom variants). Users can preview candidates and perform add/swap mutations directly on Spotify playlists.

## Version

Current documented release: `0.0.1` (MVP).

## Core User Journey

1. Sign in with Spotify
2. Sync playlists from Spotify into local cache
3. Select a track and variant type
4. Discover variants from cached data first, then Spotify/YouTube on miss
5. Preview variants in-app
6. Add or swap selected variant in playlist

## Tech Stack

- Frontend: Next.js 16 (App Router), React 19, TypeScript
- Styling/UI: Tailwind CSS 4, shadcn/ui
- Data/Auth: Supabase Postgres + Supabase Auth
- Backend compute: Supabase Edge Functions (Deno)
- External APIs: Spotify Web API, YouTube Data API v3
- Optional AI validation: Gemini API

## Prerequisites

- Node.js (current LTS recommended)
- npm
- Docker Desktop
- Supabase CLI
- Spotify Developer app credentials
- YouTube Data API key
- Optional: Gemini API key

## Quick Start

1. Install dependencies:
   - `npm install`
2. Create environment files from templates:
   - Copy `.env.example` -> `.env`
   - Copy `supabase/functions/.env.example` -> `supabase/functions/.env`
3. Fill required keys and URLs (full guide: [docs/environment-setup.md](docs/environment-setup.md)).
4. Start local Supabase:
   - `supabase start`
5. Start edge functions and app:
   - `supabase functions serve --env-file supabase/functions/.env`
   - `npm run dev`
6. Open `http://127.0.0.1:3000`

### PowerShell Script Workflow

If you use this repository's helper scripts:

- Start: `.\scripts\dev-start.ps1`
- Stop: `.\scripts\dev-stop.ps1`

Wrapper batch files are also available:

- `.\dev-start.bat`
- `.\dev-stop.bat`

## Project Structure

```text
cover-spot/
  src/
    app/                    # Next.js routes (/, /dashboard, /playlist/[id], auth callback)
    components/             # Feature and UI components
    lib/                    # Supabase clients, shared types, utilities
    middleware.ts           # Route protection/session refresh
  supabase/
    migrations/             # Database migrations
    functions/              # Edge Functions and shared helpers
  scripts/                  # PowerShell local development scripts
  docs/                     # Product and phase documentation
```

## Architecture Overview

1. User authenticates with Spotify via Supabase Auth.
2. Callback route upserts user token metadata in `public.users`.
3. Dashboard syncs playlists/tracks into Supabase cache using `snapshot_id`.
4. Variant discovery checks `track_variants` first, then external APIs on cache miss.
5. User previews candidates (Spotify embed / YouTube iframe).
6. Mutation request (add/swap) executes via edge function with conflict handling.

See [docs/coverspot-prd.md](docs/coverspot-prd.md) for full architecture and requirements.

## Environment Variables

| Variable | Scope | Location | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client-safe | `.env` | Supabase URL for browser/server client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-safe | `.env` | Public anon key |
| `NEXT_PUBLIC_APP_ORIGIN` | Client-safe | `.env` | Canonical app origin for OAuth callbacks (e.g. `https://coverspot.app`) |
| `NEXT_PUBLIC_SPOTIFY_SCOPES` | Client-safe | `.env` | OAuth scopes requested during login |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | `.env`, `supabase/functions/.env` | Never expose to client code |
| `SPOTIFY_CLIENT_ID` | Server-only | `.env`, `supabase/functions/.env` | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Server-only | `.env`, `supabase/functions/.env` | Spotify app client secret |
| `YOUTUBE_API_KEY` | Server-only | `.env`, `supabase/functions/.env` | YouTube Data API v3 |
| `GEMINI_API_KEY` | Server-only | `.env`, `supabase/functions/.env` | Optional for AI validation |
| `SUPABASE_URL` | Server-only | `supabase/functions/.env` | Local/remote Supabase URL for functions |
| `SUPABASE_ANON_KEY` | Server-only | `supabase/functions/.env` | Supabase anon key for function runtime |

For complete setup and provider configuration, see [docs/environment-setup.md](docs/environment-setup.md).

## Supabase Edge Functions

- `refresh-spotify-token`: Refreshes Spotify access tokens and updates user token state.
- `sync-playlists`: Syncs playlists and tracks from Spotify into cache with snapshot checks.
- `discover-variants`: Discovers and persists variant candidates from Spotify/YouTube.
- `mutate-playlist`: Executes add/swap playlist mutations with conflict-aware behavior.

## Database Schema (MVP)

Core tables:

- `users`
- `spotify_playlists`
- `spotify_tracks`
- `playlist_tracks_link`
- `track_variants`
- `mutation_jobs`
- `sync_jobs`

Schema source: `supabase/migrations/00001_initial_schema.sql`.

## npm Scripts

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Roadmap Docs

- [docs/coverspot-prd.md](docs/coverspot-prd.md)
- [docs/phase-1-mvp.md](docs/phase-1-mvp.md)
- [docs/phase-2-quality-and-scale.md](docs/phase-2-quality-and-scale.md)
- [docs/phase-3-growth-and-ga.md](docs/phase-3-growth-and-ga.md)

## License

License is currently TBD.
