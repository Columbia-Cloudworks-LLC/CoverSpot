---
name: docker-desktop
description: Use for Docker Desktop local development workflows on this project, including compose setup, bind mounts, healthchecks, dev vs prod targets, and secure secret handling.
---

# Docker Desktop

Use this skill when working with Docker in this repository.

## Focus

- Local development with Docker Desktop and Compose
- Fast rebuilds and hot reload using bind mounts/watch
- Safer container defaults (healthchecks, non-root users, secrets)

## Recommended workflow

1. Prefer `docker compose` for local orchestration.
2. Keep a development target separate from production target in Dockerfiles.
3. Use bind mounts for source code in development; avoid baking code into dev images.
4. Add healthchecks to app and dependencies (for example Postgres).
5. Load secrets from environment files or secret stores, not hardcoded values in images.

## Baseline compose conventions

- `depends_on` with `condition: service_healthy` for service startup ordering.
- Named volumes for stateful services.
- Distinct published ports for app/dev server/debugger.
- Use `restart: unless-stopped` for local resilience.

## Quality checks before finishing

- `docker compose config` succeeds.
- `docker compose up --build` starts all required services.
- Healthchecks report healthy.
- No secrets committed in Dockerfiles or compose YAML.

## Sources

- Docker docs (`/docker/docs` via Context7)
