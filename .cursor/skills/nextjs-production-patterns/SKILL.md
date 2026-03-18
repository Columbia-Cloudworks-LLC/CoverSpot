---
name: nextjs-production-patterns
description: Use for Next.js implementation and review in this project, including App Router data fetching and caching, Server Actions, route handlers, environment variables, and production readiness.
---

# Next.js Production Patterns

Use this skill for Next.js changes in this repository.

## Focus

- App Router-first architecture
- Correct fetch caching strategy per route
- Server Actions and safe mutation flows
- Production quality and deployment readiness

## Core patterns

- Use async Server Components for server-side data loading.
- Choose fetch behavior intentionally:
  - `cache: "force-cache"` for static-like data
  - `cache: "no-store"` for always-fresh data
  - `next: { revalidate: N }` for ISR behavior
- After mutations, revalidate using `revalidatePath` or tag-based invalidation.
- Keep secrets in server-only environment variables; never expose private keys to client bundles.

## Route and server safety

- Prefer Route Handlers for server-only integrations.
- Validate and sanitize all external input.
- Keep privileged logic on the server.

## Quality checks before finishing

- No server secret referenced from client components.
- Caching mode is explicit for non-trivial data requests.
- Mutation paths trigger revalidation.
- Build and run succeed in production mode.

## Sources

- Next.js docs (`/vercel/next.js` via Context7)
- Vercel React best practices skill (plugin skill)
