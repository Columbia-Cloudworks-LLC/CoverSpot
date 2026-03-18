# CoverSpot Phase 1: MVP

## 1. Phase Intent

Deliver a usable end-to-end workflow: connect Spotify, sync playlists, discover variants, preview candidates, and perform add/swap mutations with safe conflict handling.

## 2. Success Criteria

- First working journey: login -> sync -> discover -> preview -> add/swap.
- Cache-first discovery functional for at least one variant type per platform.
- Mutation success rate meets baseline target from master PRD.
- Core observability in place for auth, sync, discovery, and mutation failures.

## 3. Canonical Stack Baseline (No Variants)

- Frontend: Next.js (App Router) + TypeScript.
- Web hosting: Vercel.
- Data/auth: Supabase Postgres + Supabase Auth + RLS.
- Server orchestration: Supabase Edge Functions (Deno).
- External integrations: Spotify Web API + YouTube Data API v3.

## 4. In Scope

- Spotify OAuth and required scopes.
- Playlist sync with `snapshot_id`-aware caching.
- Variant types: `cover`, `live`, `acoustic`, `remix`, and custom text.
- Local-first variant lookup and cache-miss discovery for Spotify + YouTube.
- In-app playback previews (Spotify when eligible, YouTube when embeddable).
- Add and swap playlist mutation flows.
- Basic moderation: store rejected candidates and collapse by default.

## 5. Out of Scope

- Advanced admin moderation console.
- Sophisticated personalization/ranking models.
- Multi-region rollout and advanced quota optimization.
- Social or sharing features.

## 6. Functional Requirements (Phase-Specific)

### 5.1 Authentication

- Implement Spotify OAuth sign-in with recoverable error states.
- Persist only required user/session fields.
- Handle revoked token/scope by forcing re-auth.

### 5.2 Playlist Sync

- Initial and incremental sync using `snapshot_id`.
- Persist deterministic track positions for swaps.
- Support idempotent re-runs of sync jobs.

### 5.3 Discovery and Validation

- Query `track_variants` first, then external APIs on miss.
- Persist active and rejected candidates with `rejection_reason`.
- Apply rule-based filters (for example, embeddable and category checks).

### 5.4 Playback

- Spotify Web Playback SDK path for eligible users.
- YouTube IFrame fallback with clear user messaging on failure.

### 5.5 Mutation

- Add variant to playlist.
- Swap variant into exact original 0-based position.
- On snapshot conflict, re-fetch and prompt retry.

## 7. Technical Deliverables

- Supabase schema and RLS policies required for MVP entities.
- Edge Functions for token refresh, sync orchestration, and mutation orchestration.
- Logging and metrics for failure triage.
- Core E2E path test coverage.

## 8. Data Model Focus

- `users`
- `spotify_playlists`
- `spotify_tracks`
- `playlist_tracks_link`
- `track_variants`
- `mutation_jobs` (minimum audit shape)
- `sync_jobs` (minimum orchestration shape)

## 9. Testing Requirements

- Unit tests: query builder, validation logic, ranking order.
- Integration tests: OAuth session lifecycle, sync idempotency, mutation conflicts.
- E2E tests: login, discovery, preview, add, swap.

## 10. Exit Criteria

- All phase success criteria met in staging.
- No open P0/P1 defects in core journey.
- Operational runbook exists for quota exhaustion and auth failures.

## 11. Open Decisions

- Final threshold values for variant rejection.
- Exact stale-cache TTL for variant refresh.
- Initial fallback behavior for non-premium preview limitations.
