# CoverSpot Design Specification

This document describes CoverSpot's current functionality and the required pages for design mockups.

## 1. Product Summary

CoverSpot helps Spotify users discover alternate versions of songs already in their playlists (cover, live, acoustic, remix, or custom types), preview candidates, and apply changes back to Spotify through add/swap actions.

### Core value proposition

- Faster variant discovery for tracks users already care about
- Local-first workflow (cached playlists/tracks/variants) for responsive UX
- Safe playlist mutation with conflict handling to avoid overwriting recent playlist edits

### Target users

- Spotify listeners (mobile-first usage patterns)
- Users who curate and share playlists
- Users comfortable trying alternate versions before committing changes

## 2. Primary User Journey

1. User lands on CoverSpot and authenticates with Spotify.
2. User syncs playlists from Spotify.
3. User opens a playlist and selects a track.
4. User chooses a variant type and reviews discovered candidates.
5. User previews variants (Spotify embed or YouTube embed/link).
6. User applies `Add` or `Swap` (Spotify variants only).

## 3. Information Architecture (Current Routes)

### Public routes

- `/` - Landing + Spotify login entry
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy

### Authenticated routes

- `/dashboard` - Playlist library and sync entry point
- `/playlist/[id]` - Playlist detail, track list, variant discovery, preview, and mutation

### Utility / system route

- `/auth/callback` - OAuth completion and redirect (system route, not a designed destination page)

## 4. Global UX and Visual Direction

### Brand and tone

- Expressive, effortless, sharp
- Premium but approachable
- Content-forward and fast-feeling

### Important visual constraints

- Avoid Spotify-clone styling outside auth button
- Do not use Spotify neon green as a broad theme color
- Exception: `Login with Spotify` button may use official Spotify styling

### Global shell

- App-wide footer with support + legal links + version badge
- Top nav for authenticated areas with:
  - CoverSpot home link
  - User avatar menu
  - Theme switcher (System / Light / Dark)
  - Log out action
- Toast notifications for success/failure feedback

### Typography and UI scale

- Display face for headings, sans for body text
- Text tokens:
  - `text-heading`
  - `text-subheading`
  - `text-body`
  - `text-meta`
  - `text-caption`

### Core UI patterns

- Generous tap targets (`min-h-11` used broadly)
- Clear empty/loading/error/success states
- Desktop split view for discovery; mobile full-screen detail flow

## 5. Required Pages and Functional Requirements

## 5.1 Landing Page (`/`)

### Landing Purpose

First-touch marketing + authentication entry.

### Landing Required Content

- Hero title: CoverSpot
- Short product descriptor explaining discovery + add/swap behavior
- Primary CTA: `Login with Spotify`
- Helper copy: Spotify account required; premium recommended for full playback

### Landing Required Interactions

- CTA starts OAuth with Spotify scopes
- During request: loading spinner + disabled state (`Connecting...`)
- On auth failure/callback errors: show toast message and recover gracefully

### Landing States

- Default
- Connecting
- Error toast (`no_code`, `auth_failed`, generic error)

## 5.2 Dashboard (`/dashboard`)

### Dashboard Purpose

Playlist overview and sync control center.

### Dashboard Required Content

- Page title: `Your Playlists`
- Subcopy that changes based on whether playlists exist
- `Sync Playlists` action (top-right on larger layouts)
- Playlist list:
  - Featured first playlist card
  - Remaining playlists as compact list rows
  - Collaborative badge when applicable

### Dashboard Required Interactions

- `Sync Playlists` invokes sync job and refreshes content
- Playlist card click navigates to `/playlist/[id]`

### Dashboard States

- Loading skeleton page
- Populated list
- Empty state:
  - Music icon
  - "No playlists yet"
  - Guidance copy
  - Sync button
- Sync success toast with counts
- Sync failure toast

## 5.3 Playlist Detail + Discovery Workspace (`/playlist/[id]`)

### Playlist Workspace Purpose

Primary production workspace: choose a track, discover variants, preview, and mutate playlist.

### Playlist Workspace Required Content

- Back to dashboard action
- Playlist header:
  - Cover image (or fallback)
  - Playlist name
  - Track count
- Track list with row metadata:
  - Index (desktop list mode)
  - Artwork
  - Track title
  - Artist
  - Duration

### Playlist Workspace Required Interactions

- Select track to open discovery panel
- Change variant type tabs:
  - `cover`, `live`, `acoustic`, `remix`, `custom`
- Custom type input + search action
- Preview toggle per variant card
- `Add` and `Swap` actions for Spotify variants
- Conflict dialog on stale snapshot with retry path
- Collapsible rejected-results section

### Playlist Workspace Responsive Behavior

- Desktop:
  - Two-pane workflow (track rail + discovery panel)
  - Selected track keeps left pane compact
  - Discovery panel remains visible in right pane
- Mobile:
  - Track list screen first
  - Selecting a track opens dedicated discovery view
  - Back action returns to track list

### Playlist Workspace States

- No tracks in playlist (empty)
- Discovery loading skeletons
- Discovery no-results message
- Rejected-results collapsed/expanded
- Mutation in progress (`Adding...`, `Swapping...`)
- Mutation success/failure toast
- Playlist conflict modal

## 5.4 Terms of Service (`/terms`)

### Terms Page Purpose

Legal compliance and user trust.

### Terms Page Required Content

- Effective date
- Structured legal sections
- Link back to CoverSpot home
- Support contact mail link

### Terms Page States

- Static content page (light/dark compatible)

## 5.5 Privacy Policy (`/privacy`)

### Privacy Page Purpose

Privacy disclosure and data rights communication.

### Privacy Page Required Content

- Effective date
- Data collection and usage sections
- Rights/choices information
- Support contact mail link
- Link back to CoverSpot home

### Privacy Page States

- Static content page (light/dark compatible)

## 6. Core Functional Modules to Represent in Mockups

### Authentication

- Spotify OAuth start
- Callback completion
- Session-aware redirect behavior

### Playlist sync

- Manual sync trigger
- Progress indication
- Success and failure messaging

### Variant discovery

- Type-based search model
- Active vs rejected result grouping
- Custom query support

### Preview

- Spotify embedded preview
- YouTube embedded preview
- YouTube non-embeddable fallback with external link

### Mutation

- Add to playlist
- Swap in-place by track position
- Snapshot conflict recovery flow

## 7. Required Reusable Components for Mockup Coverage

- Header navigation with avatar menu
- Primary/secondary buttons and loading variants
- Playlist card (featured and list variants)
- Track row (default and compact selected mode)
- Discovery panel shell
- Variant type tabs
- Variant card with platform badge and action region
- Preview containers (Spotify/YouTube)
- Conflict dialog
- Toast styles (success/error/loading)
- Footer with legal/support links and version chip

## 8. Interaction and Feedback Rules

- Every async action needs immediate UI feedback:
  - visual loading state
  - success or error toast
- Keep copy concise and actionable:
  - "Sync failed. Please try again."
  - "Track swapped in playlist"
- Preserve user context during discovery:
  - selected track stays clear
  - rejected variants hidden by default
- Prioritize touch ergonomics on mobile:
  - large targets
  - simple back behavior
  - minimal mode confusion

## 9. Design Deliverables Checklist (For Mockup Tool)

- Landing page (default, connecting, auth error)
- Dashboard (loading, empty, populated, syncing toast)
- Playlist detail desktop (track selected with right-pane discovery)
- Playlist detail mobile (track list view + discovery view)
- Variant cards:
  - Spotify variant with Add/Swap
  - YouTube embeddable variant
  - YouTube non-embeddable fallback
  - Rejected variant row
- Conflict modal state
- Terms page
- Privacy page
- Dark and light theme examples for at least landing + workspace screens

---

If you are using this for high-fidelity design generation, prioritize `/dashboard` and `/playlist/[id]` first because they contain the core user value and most interactive complexity.
