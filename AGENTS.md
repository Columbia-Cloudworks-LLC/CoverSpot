# AGENTS.md

This file defines execution guidance for AI and human agents working in the CoverSpot application repository.

## Mission

Build and maintain CoverSpot as a reliable web app that:

- Authenticates users with Spotify
- Syncs playlists and tracks into Supabase
- Discovers track variants (cover/live/acoustic/remix)
- Safely performs playlist add/swap mutations

## Stack and Boundaries

- Frontend: Next.js App Router, React, TypeScript
- Backend: Supabase Postgres + Supabase Auth + Supabase Edge Functions
- External APIs: Spotify Web API, YouTube Data API v3, optional Gemini API

Never expose secrets in browser code. Only `NEXT_PUBLIC_*` variables are client-safe.

## Source of Truth

Read these first for context:

1. `README.md`
2. `docs/environment-setup.md`
3. `docs/coverspot-prd.md`
4. `docs/phase-1-mvp.md`

## Implementation Rules

- Keep changes scoped and reversible.
- Match existing patterns in `src/` and `supabase/`.
- Prefer clear types and explicit interfaces.
- Keep imports at top-level (no inline imports).
- Add comments only when logic is not obvious.
- Update docs when setup, env vars, or behavior changes.

## Security and Data Handling

- Do not commit `.env` files, tokens, or service-role keys.
- Do not log sensitive credentials in code or scripts.
- Keep privileged operations server-side (route handlers or edge functions).
- Respect RLS assumptions and least-privilege access.

## Local Verification Checklist

Use PowerShell commands on Windows:

- `npm run lint`
- `npm run build`

For full stack checks as needed:

- `supabase start`
- `supabase functions serve --env-file supabase/functions/.env`
- `npm run dev`

## File-Level Guidance

- UI and routes: `src/app/`, `src/components/`
- Shared app logic: `src/lib/`
- Database and SQL migrations: `supabase/migrations/`
- Edge runtime logic: `supabase/functions/`
- Dev automation scripts: `scripts/`

## Pull Request Readiness

Before proposing or merging changes:

- Confirm lint/build pass locally.
- Confirm docs and env templates are in sync.
- Describe impact, risks, and manual verification steps.
