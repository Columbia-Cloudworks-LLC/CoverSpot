# CoverSpot Environment Setup: API Keys, Scopes, and `.env` Files

This guide documents every key/secret needed for the CoverSpot MVP, where to create it, which settings to select, and where to store it locally and in Supabase.

## 1) What You Need (at a Glance)

Required for MVP:

- Supabase project values (`URL`, `anon/publishable`, `service role`)
- Spotify app (`client_id`, `client_secret`) + OAuth scopes
- YouTube Data API v3 key

Optional for MVP (if AI validation is enabled in Phase 1):

- Gemini API key (`GEMINI_API_KEY` or `GOOGLE_API_KEY`)

---

## 2) File Locations and Secret Boundaries

Use two local env files:

1. App/runtime env file (web app + backend runtime)
   - Path: `.env` (or `.env.local`)
2. Supabase Edge Functions env file
   - Path: `supabase/functions/.env`

Why two files?

- `supabase/functions/.env` is the default local secrets file for Supabase Functions.
- App-level env and function-level env often overlap, but separating them reduces accidental leakage to client code.

Also add placeholders in `.env.example` and `supabase/functions/.env.example` (safe to commit), while real `.env` files stay uncommitted.

### `.gitignore` minimum

```gitignore
.env
.env.local
supabase/functions/.env
supabase/functions/.env.local
```

---

## 3) Environment Variables to Define

## A) App/runtime (`.env` or `.env.local`)

```env
# Supabase (client-safe key can be exposed in frontend)
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Spotify OAuth
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=
SPOTIFY_SCOPES=playlist-read-private playlist-read-collaborative user-library-read playlist-modify-public playlist-modify-private user-read-private user-read-email streaming

# YouTube Data API
YOUTUBE_API_KEY=

# Optional AI validation
GEMINI_API_KEY=
```

Notes:

- If your frontend framework uses public prefixes (for example `NEXT_PUBLIC_` or `VITE_`), only expose values that are truly public (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and possibly `SPOTIFY_CLIENT_ID`).
- Never expose `SPOTIFY_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_API_KEY`, or `GEMINI_API_KEY` to browser code.

## B) Supabase Functions local env (`supabase/functions/.env`)

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

## A) Supabase (Project Keys + Function Secrets)

Where:

- Supabase Dashboard -> Project Settings -> API

What to collect:

- Project URL (`SUPABASE_URL`)
- `anon` key (or publishable key, depending on your chosen client setup)
- `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`) for Edge Functions only

Critical settings:

- Use `anon/publishable` key for client-side calls.
- Use `service_role` only in trusted server environments (Edge Functions/backend), never in browser code.

Set hosted function secrets:

```bash
supabase secrets set --env-file supabase/functions/.env
```

Useful checks:

```bash
supabase secrets list
```

Local function serve with explicit env file:

```bash
supabase functions serve --env-file supabase/functions/.env
```

## B) Spotify (OAuth App + Scopes)

Where:

- Spotify Developer Dashboard -> Create App

What to create:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

Required app settings:

1. Create an app in Spotify Dashboard.
2. Add the correct OAuth redirect URI(s) in app settings.
3. Use Authorization Code flow (with PKCE for browser-facing auth flows).

Redirect URI guidance:

- Local example: `http://127.0.0.1:3000/auth/callback`
- Staging/prod examples: `https://staging.yourdomain.com/auth/callback`, `https://app.yourdomain.com/auth/callback`
- Redirect URIs must match exactly.

Scopes to request for CoverSpot MVP:

- `playlist-read-private` (read private playlists)
- `playlist-read-collaborative` (include collaborative playlists)
- `user-library-read` (read saved tracks/library)
- `playlist-modify-public` (mutate public playlists)
- `playlist-modify-private` (mutate private playlists)
- `user-read-private` (read profile metadata such as product tier for Premium checks)
- `user-read-email` (if email identity is needed)
- `streaming` (required for Web Playback SDK; user must be Premium)

Recommended additional playback scopes (if controlling playback via Web API endpoints):

- `user-modify-playback-state`
- `user-read-playback-state`

Security:

- Store `SPOTIFY_CLIENT_SECRET` in server-only env (`supabase/functions/.env` + hosted Supabase secrets).
- Never send the client secret to frontend code.

## C) YouTube Data API v3 (Key + Restrictions)

Where:

- Google Cloud Console -> APIs & Services

Setup steps:

1. Create/select a Google Cloud project.
2. Enable **YouTube Data API v3**.
3. Create an API key.
4. Restrict the key:
   - **API restriction**: limit to YouTube Data API v3.
   - **Application restriction**:
     - If browser usage: HTTP referrer restriction (localhost + your domains).
     - If server/Edge Functions usage: keep server-side only and use IP restrictions if your runtime has stable egress IPs.

Recommended for CoverSpot:

- Call YouTube API from Edge Functions (server-side), not directly from browser, to reduce key exposure.

## D) Gemini API (Optional in MVP)

Where:

- Google AI Studio / Gemini API key management

Setup steps:

1. Create key for Gemini API.
2. Store as `GEMINI_API_KEY` (or `GOOGLE_API_KEY`, but keep naming consistent in code).
3. Apply key restrictions where available.
4. Keep usage server-side only.

Security note:

- Do not embed Gemini keys in client-side code. If real-time browser use is ever required, use short-lived/ephemeral token patterns instead of raw API keys.

---

## 5) Copy-Paste Checklists

## Local Dev Checklist

- [ ] `.env` created from `.env.example`
- [ ] `supabase/functions/.env` created from `supabase/functions/.env.example`
- [ ] Spotify redirect URI for localhost added
- [ ] Spotify scopes include all MVP scopes above
- [ ] YouTube Data API v3 enabled + key restricted
- [ ] Supabase functions start with secrets loaded

## Hosted/Staging Checklist

- [ ] All function secrets uploaded via `supabase secrets set --env-file ...`
- [ ] No secrets committed to git
- [ ] Spotify redirect URI for staging/prod added exactly
- [ ] `service_role` key only present in server-side secret stores

---

## 6) Common Mistakes to Avoid

- Missing `playlist-modify-private` causes mutation failures on private playlists.
- Missing `playlist-read-collaborative` hides collaborative playlists.
- Using Spotify Web Playback without `streaming` scope or without Premium user.
- Keeping API keys only in local `.env` but forgetting to set hosted Supabase secrets.
- Exposing server secrets to client bundles by using public env prefixes.

---

## 7) Suggested Next File to Add

Add a committed template file:

- `.env.example`
- `supabase/functions/.env.example`

with blank placeholders matching this guide so onboarding is one command-and-fill.
