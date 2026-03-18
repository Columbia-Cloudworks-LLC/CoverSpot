# CoverSpot Environment Setup: API Keys, Scopes, and `.env` Files

This guide documents every key/secret needed for the CoverSpot MVP, where to create it, which settings to select, and where to store it for the canonical stack:

- Frontend: Next.js (App Router) + TypeScript
- Hosting: Vercel
- Backend/DB/Auth: Supabase (Auth with Spotify provider)
- Server orchestration: Supabase Edge Functions (Deno)

## 1) What You Need (at a Glance)

Required for MVP:

- Supabase project values (`URL`, `anon/publishable`, `service role`)
- Spotify app (`client_id`, `client_secret`) configured as a Supabase Auth provider
- YouTube Data API v3 key

Optional for MVP (if AI validation is enabled in Phase 1):

- Gemini API key (`GEMINI_API_KEY`)

---

## 2) File Locations and Secret Boundaries

Two env files, one purpose each:

1. **App env file** (Next.js runtime -- both browser-safe and server-only vars)
   - Path: `.env`
   - Browser-safe vars use the `NEXT_PUBLIC_` prefix; all others are server-only.
2. **Supabase Edge Functions env file**
   - Path: `supabase/functions/.env`

Why two files?

- `supabase/functions/.env` is the default local secrets file for `supabase functions serve`.
- The root `.env` is loaded by Next.js for both server and client code, with the `NEXT_PUBLIC_` prefix controlling browser exposure.

Also add committed template files (`.env.example` and `supabase/functions/.env.example`) with blank placeholders. Real `.env` files stay uncommitted.

### `.gitignore` minimum

```gitignore
.env
.env.local
supabase/functions/.env
supabase/functions/.env.local
```

---

## 3) Environment Variables to Define

### A) Next.js app (`.env`)

```env
# Browser-safe variables (exposed to client bundle via NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SPOTIFY_SCOPES=playlist-read-private playlist-read-collaborative user-library-read playlist-modify-public playlist-modify-private user-read-private user-read-email streaming

# Server-only variables (no NEXT_PUBLIC_ prefix, never in browser bundle)
SUPABASE_SERVICE_ROLE_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
YOUTUBE_API_KEY=
GEMINI_API_KEY=
```

Notes:

- Variables without `NEXT_PUBLIC_` are only available in Next.js server components, API routes, and middleware. They are never bundled into client JavaScript.
- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are present here so the `dev-start.ps1` script can generate a single file from 1Password. They are primarily consumed by Edge Functions and the Supabase Auth provider config.

### B) Supabase Functions local env (`supabase/functions/.env`)

```env
# Core Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Third-party provider keys for server-side calls
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
YOUTUBE_API_KEY=
GEMINI_API_KEY=
```

---

## 4) Provider Setup Instructions

### A) Supabase (Project Keys + Auth Provider)

**Project keys:**

- Supabase Dashboard -> Project Settings -> API
- Collect: Project URL, `anon` key, `service_role` key.
- Use `anon` key for client-side calls; `service_role` only in Edge Functions.

**Configure Spotify as auth provider (remote):**

1. Supabase Dashboard -> Authentication -> Providers -> Spotify.
2. Enable the Spotify provider.
3. Enter `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
4. Copy the callback URL shown (format: `https://<project-ref>.supabase.co/auth/v1/callback`) and add it as a redirect URI in the Spotify Developer Dashboard.
5. Set Site URL to your production app URL (e.g., `https://coverspot.app`).
6. Add `http://127.0.0.1:3000` to Redirect URLs for local development.

**Configure Spotify as auth provider (local Supabase):**

In `supabase/config.toml` (created by `supabase init`):

```toml
[auth.external.spotify]
enabled = true
client_id = "env(SPOTIFY_CLIENT_ID)"
secret = "env(SPOTIFY_CLIENT_SECRET)"
redirect_uri = ""
```

The local Supabase auth callback URL is `http://127.0.0.1:54321/auth/v1/callback`. Add this as an additional redirect URI in your Spotify Developer Dashboard.

**Enable required extensions:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

**Set hosted function secrets:**

```powershell
supabase secrets set --env-file supabase/functions/.env
```

**Useful checks:**

```powershell
supabase secrets list
```

### B) Spotify (OAuth App + Scopes)

Where:

- Spotify Developer Dashboard -> Create App

What to create:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

Required app settings:

1. Create an app in Spotify Dashboard.
2. Add redirect URIs for every environment where Supabase Auth runs:
   - Remote: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Local Supabase: `http://127.0.0.1:54321/auth/v1/callback`
3. The OAuth flow is Authorization Code (managed by Supabase Auth with PKCE).

Scopes requested for CoverSpot MVP (passed via `signInWithOAuth`):

- `playlist-read-private` (read private playlists)
- `playlist-read-collaborative` (include collaborative playlists)
- `user-library-read` (read saved tracks/library)
- `playlist-modify-public` (mutate public playlists)
- `playlist-modify-private` (mutate private playlists)
- `user-read-private` (read profile metadata such as product tier for Premium checks)
- `user-read-email` (email identity for user record)
- `streaming` (required for Web Playback SDK; user must be Premium)

Additional playback scopes (not required for MVP, consider for later phases):

- `user-modify-playback-state`
- `user-read-playback-state`

Security:

- `SPOTIFY_CLIENT_SECRET` lives in server-only env files and the Supabase Auth provider config. Never expose it to frontend code.

### C) YouTube Data API v3 (Key + Restrictions)

Where:

- Google Cloud Console -> APIs & Services

Setup steps:

1. Create/select a Google Cloud project.
2. Enable **YouTube Data API v3**.
3. Create an API key.
4. Restrict the key:
   - **API restriction**: limit to YouTube Data API v3.
   - **Application restriction**: keep server-side only and use IP restrictions if your runtime has stable egress IPs.

YouTube API calls are made from Edge Functions (server-side), not from browser code.

### D) Gemini API (Optional in MVP)

Where:

- Google AI Studio / Gemini API key management

Setup steps:

1. Create key for Gemini API.
2. Store as `GEMINI_API_KEY`.
3. Apply key restrictions where available.
4. Keep usage server-side only (Edge Functions).

---

## 5) Local Supabase Development Workflow

CoverSpot uses local Supabase for development and testing before deploying to the remote instance.

### Prerequisites

- Docker Desktop installed and running.
- Supabase CLI installed (`npm install -g supabase` or via package manager).

### Initial Setup

```powershell
# Initialize Supabase in the project (creates supabase/config.toml if not present)
supabase init

# Start local Supabase services (Postgres, Auth, Storage, Edge Functions, Studio)
supabase start
```

`supabase start` outputs local URLs and keys:

| Service    | Local URL |
| :--------- | :-------- |
| API URL    | `http://127.0.0.1:54321` |
| Studio     | `http://127.0.0.1:54323` |
| DB URL     | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Anon Key   | (printed on start) |
| Service Key| (printed on start) |

### Env File Values for Local Development

For the root `.env`, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the local values printed by `supabase start`.

For `supabase/functions/.env`, set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the local values.

The `dev-start.ps1` script generates env files pointing to the **remote** Supabase instance from 1Password. To test against local Supabase, either:

1. Manually set local URLs/keys in `.env` and `supabase/functions/.env`, or
2. Create a `.env.local` file with local overrides (Next.js loads `.env.local` after `.env`, and values in `.env.local` take precedence).

### Running Locally

```powershell
# Terminal 1: Local Supabase
supabase start

# Terminal 2: Edge Functions (with local secrets)
supabase functions serve --env-file supabase/functions/.env

# Terminal 3: Next.js dev server
npm run dev
```

### Applying Migrations Locally

Migrations in `supabase/migrations/` are automatically applied when `supabase start` runs. To apply new migrations:

```powershell
supabase db reset
```

### Spotify OAuth with Local Supabase

1. Add `http://127.0.0.1:54321/auth/v1/callback` as a redirect URI in your Spotify Developer Dashboard.
2. Ensure `supabase/config.toml` has the Spotify auth provider configured (see section 4A).
3. Ensure `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set in `supabase/functions/.env` (referenced by `config.toml` via `env()`).
4. After `supabase start`, the local auth flow works identically to remote.

### Stopping Local Supabase

```powershell
supabase stop
```

---

## 6) Copy-Paste Checklists

### Local Dev Checklist

- [ ] Docker Desktop running
- [ ] `supabase init` completed (config.toml exists)
- [ ] Spotify provider configured in `supabase/config.toml`
- [ ] `.env` created with local Supabase URLs/keys and `NEXT_PUBLIC_` prefixes
- [ ] `supabase/functions/.env` created with local Supabase URLs/keys and API secrets
- [ ] Spotify redirect URI for local Supabase (`http://127.0.0.1:54321/auth/v1/callback`) added to Spotify Dashboard
- [ ] `supabase start` succeeds
- [ ] YouTube Data API v3 enabled + key restricted
- [ ] `npm run dev` starts Next.js on `http://127.0.0.1:3000`

### Hosted/Staging Checklist

- [ ] Spotify provider enabled in Supabase Dashboard (Authentication -> Providers)
- [ ] Remote callback URI (`https://<project-ref>.supabase.co/auth/v1/callback`) added to Spotify Dashboard
- [ ] All function secrets uploaded via `supabase secrets set --env-file ...`
- [ ] `pg_cron` and `pg_net` extensions enabled
- [ ] No secrets committed to git
- [ ] `service_role` key only present in server-side secret stores
- [ ] Vercel env vars set for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and any server-only vars needed by Next.js API routes

---

## 7) Common Mistakes to Avoid

- Missing `playlist-modify-private` causes mutation failures on private playlists.
- Missing `playlist-read-collaborative` hides collaborative playlists.
- Using Spotify Web Playback without `streaming` scope or without Premium user.
- Keeping API keys only in local function env files but forgetting to set hosted Supabase secrets.
- Exposing server secrets to client bundles by accidentally adding `NEXT_PUBLIC_` prefix.
- Using the wrong redirect URI in Spotify Dashboard (must be the Supabase Auth callback URL, not the Next.js app URL).
- Forgetting to add the local Supabase callback URI (`http://127.0.0.1:54321/auth/v1/callback`) to the Spotify Developer Dashboard when testing locally.
- Not enabling `pg_cron` and `pg_net` extensions before deploying background job logic.
