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

When reviewing code in this repository, prioritize **long-term maintainability** over small style issues.

For every review, apply this three-question framework:

1. **Does it reuse?**
   - Prefer existing utilities, types, and patterns.
   - Flag any duplicate helpers, types, or exports (e.g., extra date formatters or user types).
   - Suggest consolidating new code into existing abstractions where possible.

2. **Does it follow conventions?**
   - Enforce existing naming, folder structure, error-handling patterns, and state-management approaches.
   - Call out files that look inconsistent with the rest of the codebase.
   - Avoid introducing new patterns when a similar pattern already exists.

3. **Can a typical team member explain it?**
   - Flag code that is unusually complex or hard to reason about.
   - Treat heavy use of `eslint-disable`, `ts-ignore`, or similar suppressions as a smell.
   - Prefer understandable, debuggable flows over clever or opaque solutions.

Explicitly look for AI-specific technical debt:

- Suppressed lint/type errors instead of fixes.
- Duplicate or unused exports, helpers, and types.
- Complex flows (auth, payments, migrations) that rely on fragile assumptions.
