# Contributing to CoverSpot

Thanks for contributing.

## Prerequisites

- Node.js LTS
- npm
- Docker Desktop
- Supabase CLI

## Local Setup

1. Install dependencies:
   - `npm install`
2. Copy environment templates:
   - `.env.example` -> `.env`
   - `supabase/functions/.env.example` -> `supabase/functions/.env`
3. Fill required values using `docs/environment-setup.md`.
4. Start local services:
   - `supabase start`
   - `supabase functions serve --env-file supabase/functions/.env`
   - `npm run dev`

PowerShell helpers are available:

- `.\scripts\dev-start.ps1`
- `.\scripts\dev-stop.ps1`

## Branch and PR Guidelines

- Create focused branches from `main`.
- Keep pull requests small and reviewable.
- Update docs when behavior or setup changes.
- Do not commit secrets (`.env`, API keys, service role keys).

## Before Opening a Pull Request

- Run `npm run lint`
- Run `npm run build`
- Verify key user flows changed by your work
- Complete the pull request template checklist

## Commit Guidance

- Use clear commit messages describing intent.
- Prefer multiple small commits over one large mixed commit.
