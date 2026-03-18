# Product Requirements Document: CoverSpot

## 1. Product Overview

CoverSpot is a web application that connects to a user's Spotify account, syncs their playlists, and helps discover, preview, and manage alternate versions of songs. Users can find and add/swap originals for Covers, Live Performances, Acoustic Renditions, Remixes, or custom user-defined variants (for example, "AI Frank Sinatra") across Spotify and YouTube.

## 2. Goals, Non-Goals, and Success Metrics

### 2.1 Product Goals

- Reduce time to discover usable variants for a playlist track.
- Enable in-app preview and one-click playlist mutation (add/swap).
- Build a durable, global variant cache to reduce repeated API spend.

### 2.2 Non-Goals (v1)

- Full DAW/audio editing workflows.
- Supporting non-Spotify playlist providers (Apple Music, Deezer, etc.).
- Public social feed or sharing network for user profiles/playlists.

### 2.3 Success Metrics (MVP)

- Median time from track click to first playable variant: <= 3 seconds on cache hit.
- Variant cache hit rate for repeated requests: >= 60% within 30 days.
- Swap/add operation success rate: >= 99% (excluding upstream outages).
- Weekly active users who perform at least one mutation: target defined during beta.

## 3. Scope and Functional Requirements

### 3.1 Authentication and Permissions

- Spotify is the sole authentication provider. Sign-in uses Supabase Auth's built-in Spotify OAuth provider (`signInWithOAuth({ provider: 'spotify' })`).
- Supabase Auth handles the OAuth dance, session creation, and `auth.users` row management. A custom `public.users` table linked via `auth.uid()` stores Spotify-specific tokens for proactive server-side refresh.
- The Spotify redirect URI registered in the Spotify Developer Dashboard must point to Supabase Auth's callback endpoint (`https://<project-ref>.supabase.co/auth/v1/callback` for remote, `http://127.0.0.1:54321/auth/v1/callback` for local Supabase).
- Required OAuth scopes: `playlist-read-private`, `playlist-read-collaborative`, `user-library-read`, `playlist-modify-public`, `playlist-modify-private`, `user-read-private`, `user-read-email`, `streaming`.
- Session invalidation and re-auth are required when token refresh fails or scopes are revoked.
- Premium status must be checked for Spotify Web Playback SDK usage; if unavailable, fallback discovery still works.

### 3.2 Playlist Sync and Caching

- Dashboard should load from local cache first and sync in the background.
- Initial sync and incremental sync are supported using Spotify `snapshot_id` for change detection.
- Track order must be stored and preserved for deterministic swap behavior.
- Sync jobs must be idempotent and safe to re-run.

### 3.3 Variant Discovery and Ranking

- Users choose a variant type from preset categories (`cover`, `live`, `acoustic`, `remix`) or custom text.
- Discovery follows local-first lookup; external APIs are queried only on cache miss or stale cache.
- Returned variants are grouped by status (`active`, `review`, `rejected`) and ranked by relevance.
- Rejected items remain queryable behind a collapsed "Low Quality / Hidden" section to avoid repeated API cost.

### 3.4 Preview and Playback

- Users can preview Spotify variants using Web Playback SDK when allowed.
- Users can preview YouTube variants via IFrame Player API when embeddable.
- If playback cannot start, the UI presents a clear reason and a retry action.

### 3.5 Playlist Mutation

- **Add** appends chosen variant to target playlist.
- **Swap** replaces original at the exact same 0-based position.
- Mutation operations must verify latest playlist `snapshot_id` to prevent race-condition corruption.
- On mismatch/conflict, app must re-fetch playlist state and prompt user to retry.

### 3.6 Moderation and Quality Controls

- Users can flag invalid variants with a reason.
- Duplicate flagging by the same user for the same variant is blocked.
- Variants crossing moderation threshold are auto-rejected and hidden by default.
- Admin/service workflows can manually restore false positives.

## 4. Tech Stack Core

- **Frontend:** Next.js (App Router) with TypeScript.
- **Web Hosting:** Vercel for Next.js deployments and environment management.
- **Database & Backend:** Supabase (PostgreSQL for users, playlists, track cache, variant relationships), `pg_cron` and `pg_net` for async orchestration.
- **External APIs:** Spotify Web API (auth, playlists, search, mutation), YouTube Data API v3 (search and metadata).
- **Playback Integration:** Spotify Web Playback SDK, YouTube IFrame Player API.
- **Compute:** Supabase Edge Functions (Deno) for orchestration, token handling, and validation.
- **Required Extensions:** `pg_cron` and `pg_net` must be enabled in Supabase for background job scheduling and async HTTP calls from within Postgres.
- **AI Filtering:** Cost-efficient asynchronous model pass (for example Gemini Flash class) for periodic semantic validation.
- **Caching:** Supabase Smart CDN edge caching to minimize egress and quota consumption.

## 5. Database Architecture and Schema

The schema uses UUIDs, is normalized to 3NF, and maintains a global variant knowledge base to reduce repeated API queries.

### 5.1 `users` (Identity and Session Store)

This table extends Supabase Auth's `auth.users` with Spotify-specific fields. The `id` column references `auth.users.id` directly (set on insert via `auth.uid()`). Spotify provider tokens from the initial OAuth sign-in are copied here so that Edge Functions can proactively refresh them server-side (Spotify tokens expire every 3600 seconds).

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PK, references `auth.users(id)` ON DELETE CASCADE | Set to `auth.uid()` on insert. |
| spotify_id | VARCHAR(255) | UNIQUE, NOT NULL | External Spotify user ID. |
| email | VARCHAR(255) | NOT NULL | User email from OAuth. |
| spotify_access_token | TEXT | NOT NULL | Current access token (encrypted at rest). |
| spotify_refresh_token | TEXT | NOT NULL | Refresh token for backend renewal (encrypted at rest). |
| token_expires_at | TIMESTAMPTZ | NOT NULL | Expiration timestamp for proactive refresh. |
| premium_status | BOOLEAN | DEFAULT false | Playback eligibility for Spotify Web Playback SDK. |

### 5.2 `spotify_playlists` (Playlist Cache)

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PK, default `gen_random_uuid()` | Internal playlist ID. |
| user_id | UUID | FK (`users.id`) ON DELETE CASCADE | Playlist owner. |
| spotify_playlist_id | VARCHAR(255) | UNIQUE, NOT NULL | External Spotify playlist ID. |
| name | VARCHAR(255) | NOT NULL | Playlist name. |
| is_collaborative | BOOLEAN | DEFAULT false | Determines mutation permissions. |
| snapshot_id | VARCHAR(255) | NOT NULL | Spotify version ID for optimistic concurrency. |
| last_synced_at | TIMESTAMPTZ | DEFAULT NOW() | Last successful sync timestamp. |

### 5.3 `spotify_tracks` (Global Deduplicated Track Cache)

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | Internal track ID. |
| spotify_track_id | VARCHAR(255) | UNIQUE, NOT NULL | Canonical Spotify track ID. |
| title | VARCHAR(255) | NOT NULL | Official track title. |
| artist_name | VARCHAR(255) | NOT NULL | Primary artist(s). |
| duration_ms | INTEGER | NOT NULL | Track duration. |
| raw_metadata | JSONB | NULLABLE | Full Spotify payload for reprocessing. |

### 5.4 `playlist_tracks_link` (Junction Table)

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| playlist_id | UUID | FK ON DELETE CASCADE | Reference to cached playlist. |
| track_id | UUID | FK ON DELETE CASCADE | Reference to cached track. |
| position | INTEGER | NOT NULL | 0-based index; required for deterministic swap. |
| added_at | TIMESTAMPTZ | NOT NULL | Original add timestamp. |

### 5.5 `track_variants` (Variant Relationship Engine)

This table stores original-to-variant relationships and rejected candidates to avoid repeated API waste.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | Internal variant ID. |
| original_track_id | UUID | FK (`spotify_tracks.id`) ON DELETE CASCADE | Parent original track. |
| platform | VARCHAR(50) | NOT NULL | `spotify` or `youtube`. |
| platform_id | VARCHAR(255) | UNIQUE, NOT NULL | Spotify track ID or YouTube video ID. |
| variant_type | VARCHAR(50) | NOT NULL | `cover`, `live`, `acoustic`, `remix`, `ai`, `custom`. |
| title | VARCHAR(500) | NOT NULL | Track/video title. |
| artist_or_channel | VARCHAR(255) | NOT NULL | Artist or YouTube channel. |
| embeddable | BOOLEAN | DEFAULT true | Required for YouTube iframe playback. |
| status | VARCHAR(20) | DEFAULT `active` | `active`, `review`, or `rejected`. |
| rejection_reason | VARCHAR(255) | NULLABLE | Why candidate was rejected. |
| relevance_score | NUMERIC(5,2) | NULLABLE | Quality/ranking score from validators. |
| flag_count | INTEGER | DEFAULT 0 | Community moderation count. |
| discovered_at | TIMESTAMPTZ | DEFAULT NOW() | First discovery timestamp. |

### 5.6 Required Supporting Tables

- `mutation_jobs`: records add/swap requests, upstream response status, retries, and final result for auditability. **Required in Phase 1.**
- `sync_jobs`: tracks playlist sync execution status, runtime, and retry state. **Required in Phase 1.**
- `variant_flags`: `(id, variant_id, user_id, reason, created_at)` with unique `(variant_id, user_id)` to enforce one flag per user. **Introduced in Phase 2** when community moderation is added.

### 5.7 Row Level Security (RLS) and Governance

- `users`: strict access with `auth.uid() = id`.
- `spotify_playlists` and `playlist_tracks_link`: read access limited to owner; writes via service-role Edge Functions.
- Global datasets (`spotify_tracks`, `track_variants`): read-only for clients; write/update only through service-role pipelines.
- Service-role keys must never be exposed in browser code.

## 6. API Orchestration and Rate Limit Strategy

### 6.1 Spotify Token and Limit Management

- Token refresh is handled by a Supabase Edge Function (`refresh-spotify-token`) triggered proactively about 5 minutes before expiration. The function reads the current refresh token from `public.users`, calls Spotify's token endpoint, and writes the new access/refresh tokens back.
- On `429`, workers honor `Retry-After` and apply 500-1500ms jitter.
- Persistent refresh failure triggers secure token purge and user re-auth flow.

### 6.2 Async Syncing

- `pg_cron` schedules background sync calls to Edge Functions.
- Pagination is processed asynchronously with bounded concurrency and exponential backoff.
- Jobs must be idempotent by playlist and snapshot to avoid duplicate writes.

### 6.3 Local-First Quota Preservation

- Query `track_variants` first by `original_track_id + variant_type`.
- **Cache hit (active/review):** return immediately.
- **Cache hit (rejected):** return in collapsed hidden section.
- **Cache miss/stale:** query Spotify/YouTube, validate, persist results, then return.

## 7. Search and Multi-Tier Validation Pipeline

### Tier 1: Dynamic Query Builder

- Spotify base query: `track:"{title}" {variant_type}`.
- Conditional: for `cover`, exclude original artist; for `live/acoustic/remix`, retain original artist signal.
- YouTube base query: `"{title}" "{artist}" {variant_type}` with negative terms (for example `-karaoke`), plus `type=video` and `videoEmbeddable=true`.

### Tier 2: Hard Metadata Filters

- Validate YouTube `categoryId`; non-music/non-entertainment entries are rejected.
- Reject missing required metadata fields (title, channel, duration).

### Tier 3: Asynchronous Semantic Scoring

- Cron-driven LLM pass evaluates unscored or stale records in batches.
- If score < threshold (initially 0.60), set status to `rejected` with reason.
- Threshold must be configuration-driven and adjustable without redeploy.

### Tier 4: Community Moderation

- Users can flag "wrong variant," "bad audio," or "not embeddable/blocked."
- At threshold (initially 2 distinct users), record auto-transitions to `rejected`.
- Moderator override can restore status to `review` or `active`.

## 8. Edge Cases and Graceful Degradation

- **Region-blocked tracks:** if Spotify `is_playable=false`, attempt `linked_from` IDs where available.
- **YouTube embedding disabled:** on iframe error code 150, show explicit message and mark candidate accordingly.
- **Revoked OAuth:** detect `401 invalid_grant`, invalidate session, and require re-authorization.
- **YouTube quota exhaustion (`403`):** enter degraded mode; hide fresh YouTube discovery and serve cached + Spotify results.
- **Insufficient playlist permissions:** disable mutation UI when user cannot modify playlist.
- **Concurrent playlist edits:** on snapshot mismatch during mutation, refresh latest order and present retry option.

## 9. Non-Functional Requirements (Missing in original draft)

### 9.1 Performance

- Dashboard first render from cache <= 2s p50 on broadband.
- Variant query response <= 3s p50 on cache hit and <= 8s p95 on miss.
- Mutation confirmation visible <= 2s p50 after upstream success.

### 9.2 Reliability

- Background jobs retry with capped exponential backoff.
- No data corruption on duplicate webhook/job delivery (idempotency required).
- Error budget and alerting thresholds defined before public beta.

### 9.3 Security and Privacy

- OAuth tokens encrypted at rest and redacted from logs.
- Principle of least privilege for all API keys and DB roles.
- Data retention policy for cached tracks/variants and user deletion requests.
- GDPR/CCPA-ready export/delete workflow for account-linked user data.

### 9.4 Observability

- Structured logs for sync, discovery, moderation, and mutation flows.
- Metrics: cache hit rate, API spend, mutation failures, playback failures, flagged-rate by variant type.
- Alerting on elevated 429/403/401 rates and job queue failure spikes.

## 10. UX Requirements

- Provide clear loading states for cache lookup, background fetch, and validation.
- Explain why an item is rejected or hidden (human-readable reason).
- Preserve user context when switching between Spotify and YouTube tabs.
- Mutation actions must include success/error toast and easy retry path.
- Accessibility: keyboard navigable controls, labels for screen readers, color contrast compliant.

## 11. User Stories and Acceptance Criteria

### Epic 1: Identity and Validation

**Story 1.1:** As an unauthenticated user, I want to log in via Spotify OAuth so the app can securely read and modify my playlists.  
**AC:** Successful OAuth creates session and stores only required profile/token fields; permission denial shows recoverable error.

**Story 1.2:** As the system, I need to verify Spotify Premium status to ensure Web Playback SDK functionality.  
**AC:** Premium users can initialize Spotify playback; non-premium users see fallback preview limitations without blocking discovery.

### Epic 2: Data Sync and Relational Caching

**Story 2.1:** As a user, I want the dashboard to load instantly while sync runs asynchronously.  
**AC:** Cached playlists/tracks render first; background sync updates UI once complete; stale indicator is shown during refresh.

**Story 2.2:** As the system, I must populate `track_variants` globally to reduce future API calls.  
**AC:** Validated Spotify/YouTube results persist with correct `original_track_id`, `variant_type`, `platform`, and status.

### Epic 3: Variant Discovery and Playback

**Story 3.1:** As a user selecting a track, I want to choose the variant type (Cover, Live, Acoustic, Remix, Custom).  
**AC:** Selector updates query strategy and refreshes result list.

**Story 3.2:** As a user, I want to see Spotify and YouTube variants from cache or APIs in one interface.  
**AC:** Local-first query occurs before API calls; active results rank above rejected; rejected list is collapsed by default.

**Story 3.3:** As a user, I want in-app playback previews before I mutate my playlist.  
**AC:** Spotify/YouTube preview controls work when embeddable/playable; failures show reason and fallback action.

### Epic 4: Playlist Mutation

**Story 4.1 (Add):** As a user, I want to append a selected variant to my playlist.  
**AC:** Add writes to Spotify successfully, records mutation audit row, and updates local cache.

**Story 4.2 (Swap):** As a user, I want to replace the original track with a variant at the same position.  
**AC:** Swap removes original and inserts variant at the same 0-based index, handles snapshot conflicts safely, and syncs cache.

## 12. Rollout, Testing, and Open Questions

### 12.1 Rollout Plan

- Alpha: internal testing with seeded playlists and synthetic edge cases.
- Beta: limited user cohort with API quota monitoring.
- GA: staged rollout behind feature flag by account cohort.

### 12.2 Test Requirements

- Unit tests for query builder, ranking, and rejection logic.
- Integration tests for token refresh, playlist sync, and mutation flows.
- E2E tests for login, discover, preview, add, and swap user journey.
- Load test for concurrent background jobs and API retry behavior.

### 12.3 Open Questions

- Exact variant TTL policy before forced re-validation.
- Final moderation threshold and whether it is global or category-specific.
- Whether custom variant prompts should support saved presets per user.

## 13. Phase Documents

This PRD remains the source-of-truth overview. Detailed execution for each phase lives in separate docs:

- `CoverSpot Phase 1 - MVP.md`
- `CoverSpot Phase 2 - Quality and Scale.md`
- `CoverSpot Phase 3 - Growth and GA.md`
