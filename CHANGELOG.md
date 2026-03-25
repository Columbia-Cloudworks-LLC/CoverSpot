# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Playlist editor (3-column layout):** `LayoutShell`, `PlaylistSidebar`, and `TrackPanel` under `src/components/workspace/` — full-viewport drill-down from playlists → tracks → variant discovery on `/dashboard`, reusing existing `VariantDiscoveryPanel`, `VariantCard`, preview players, mutations, and sync.
- **Layout animation:** `.workspace-grid` utility in `globals.css` for smooth `grid-template-columns` transitions when the right panel expands (with `prefers-reduced-motion` support).
- **Discovery UX:** Variant results grouped by source (**On Spotify** / **On YouTube**) within each variant type tab in `variant-discovery-panel.tsx`.

### Changed

- **Dashboard:** Replaced the playlist card grid with the unified workspace; server still loads playlists, tracks load client-side when a playlist is selected (same data model as `/playlist/[id]`).
- **Dashboard shell:** `dashboard/layout.tsx` uses full-width, full-height `main` with overflow contained for the grid; `DashboardNav` spans the viewport (no `max-w-5xl`).
- **Loading:** Dashboard `loading.tsx` skeleton matches the three-column layout.

### Fixed

- Declare all Edge Functions in `supabase/config.toml` so Supabase GitHub/Branching auto-deploys them (avoids “only Functions declared in config.toml” warnings).

## [0.1.0] - 2026-03-19

### Added

- **Legal & trust:** dedicated **Privacy Policy** (`/privacy`) and **Terms of Service** (`/terms`) pages.
- **Chrome:** site **Footer** with support/contact helpers (`src/lib/coverspot-support.ts`) and layout wiring.
- **Branding:** Columbia Cloudworks logo asset for footer/partner presentation.
- **Theming:** `ThemeProvider` integration and expanded global design tokens / dark–light styling in `globals.css`.
- **Playlist UX:** playlist route **layout** shell; richer **playlist cards**, **track list** / **track row** presentation, and **sync** control polish.
- **Discovery & playback:** **variant discovery panel** and **variant card** refinements; **YouTube player** behavior updates.
- **UI primitives:** **tooltip** component for denser affordances without clutter.
- **Auth:** OAuth **callback** route hardening and **middleware** adjustments for routing consistency.
- **Backend:** `discover-variants` edge function updates (broader discovery / filtering behavior).
- **Tooling & docs (repo):** Impeccable **frontend-design** skill pack with reference docs; companion skills (adapt, animate, arrange, audit, bolder, clarify, colorize, critique, delight, distill, extract, harden, normalize, onboard, optimize, overdrive, polish, quieter, teach-impeccable, typeset); **shadcn** skill pack and assets; **skills-lock.json** for skill versioning.
- **QA:** Perplexity/browser-agent **customer readiness** prompt under `.cursor/prompts/`.
- **Design context:** `CLAUDE.md` and `.impeccable.md` for product and UI guidance.
- **Research (draft):** `docs/.temp/match-scoring-and-confidence-system.md` for variant match scoring notes.

### Changed

- **Landing & dashboard:** landing page and **login button** flow improvements; dashboard **loading** state and **page** layout; **dashboard nav** tweaks.
- **Next.js:** `next.config.ts` updates aligned with App Router / asset and build behavior.
- **Dependencies:** `package-lock.json` sync with current dependency tree.

### Fixed

- **Git:** ignore `.dev-session.json` for local dev session metadata.

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
