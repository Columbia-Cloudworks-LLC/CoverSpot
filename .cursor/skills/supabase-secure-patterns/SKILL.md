---
name: supabase-secure-patterns
description: Use for Supabase architecture, auth, RLS, edge function patterns, and safe key handling in this project.
---

# Supabase Secure Patterns

Use this skill when implementing Supabase features.

## Focus

- Auth-aware data access
- Row Level Security (RLS) by default
- Correct server/client key boundaries
- Safe Edge Function usage

## Core rules

- Enable and rely on RLS for all user data tables.
- Use anon key in public clients and service role key only in trusted server environments.
- In Edge Functions, pass caller auth context so queries respect user RLS.
- Keep Supabase secrets in environment variables, never in source code.

## Schema and query guidance

- Index columns used in filters and joins.
- Use explicit select lists when practical.
- Design policies early to avoid bypassing RLS in app logic.

## Local and deployment workflow

- Use Supabase CLI for local function/database workflows.
- Validate migrations and policies before deploying.
- Treat policy changes as production-impacting changes.

## Quality checks before finishing

- RLS policy exists for every user-facing table.
- No service role key in frontend code.
- Function auth path tested with and without auth token.

## Sources

- Supabase docs (`/supabase/supabase` via Context7)
- Supabase Postgres best practices skill (plugin skill)
