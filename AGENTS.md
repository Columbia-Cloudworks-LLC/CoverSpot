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

## External Tooling

### Supabase (MCP + CLI)

Production project ref: `lasqdllhyerpaufhzunw`

MCP server `plugin-supabase-supabase` provides direct access to:

- `execute_sql` -- query the production database
- `get_logs` -- retrieve edge function, auth, postgres, and API logs (last 24h). Use `service: "edge-function"` for function debugging.
- `list_edge_functions` / `get_edge_function` -- inspect deployed functions
- `deploy_edge_function` -- deploy function changes
- `list_tables` / `list_migrations` -- inspect schema

CLI commands for secrets (not available via MCP):

```
supabase secrets list --project-ref lasqdllhyerpaufhzunw
supabase secrets set KEY=value --project-ref lasqdllhyerpaufhzunw
```

### Required Edge Function Secrets

These must be set in production Supabase secrets. Template files at `.env.example` and `supabase/functions/.env.example` list them all.

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- `YOUTUBE_API_KEY`
- `GEMINI_API_KEY`

### Google Cloud (gcloud MCP)

GCP project: `coverspot` under `nicholas.king@columbiacloudworks.com`

MCP server `user-gcloud` provides `run_gcloud_command`. Always switch to the correct account first:

```
gcloud config set account nicholas.king@columbiacloudworks.com
```

Useful diagnostic commands:

- `services list --enabled --project=coverspot` -- check enabled APIs
- `services api-keys list --project=coverspot` -- list API keys and restrictions
- `services api-keys describe RESOURCE_NAME` -- full key details
- `projects get-iam-policy coverspot` -- check IAM bindings

The owner's personal account (`viral.architect@gmail.com`) has separate projects and should not be used for CoverSpot operations.

### Vercel

Production domain: `coverspot.app`

MCP server `plugin-vercel-vercel` is available for deployment management. Authenticate via the `mcp_auth` tool if needed.

### GitHub

MCP server `user-github` provides repository and PR management.

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
