# CoverSpot Copilot Instructions

Follow these repository rules when generating code.

## Product and Stack Context

- CoverSpot is a Next.js App Router app for Spotify playlist variant discovery and mutation.
- Primary stack: Next.js 16, React 19, TypeScript, Supabase Postgres/Auth/Edge Functions.
- Use existing project conventions and naming in `src/` and `supabase/`.

## Coding Expectations

- Keep changes minimal and production-focused.
- Prefer server-side logic for secrets and provider keys.
- Never expose server-only values to client code (`NEXT_PUBLIC_` only for safe public values).
- Use strict TypeScript patterns and avoid `any` unless unavoidable.
- Keep imports at the top of files.
- Add concise comments only when logic is non-obvious.

## Data and API Safety

- Respect Supabase RLS and existing auth assumptions.
- Treat Spotify/YouTube/Gemini credentials as server-only.
- Do not log access tokens, refresh tokens, or secrets.

## Workflow Expectations

- Prefer PowerShell command examples in docs/scripts for local dev on Windows.
- Validate with:
  - `npm run lint`
  - `npm run build`
- If setup or env requirements change, update `docs/environment-setup.md` and `.env.example`.

## Files to Review Before Major Changes

- `README.md`
- `docs/environment-setup.md`
- `docs/coverspot-prd.md`
- `supabase/migrations/`

If uncertain, prefer the simplest implementation that preserves current behavior.
