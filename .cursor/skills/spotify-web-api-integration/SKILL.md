---
name: spotify-web-api-integration
description: Use for Spotify Web API integration tasks in this project, including OAuth flow selection, token refresh handling, endpoint usage, and error/retry handling.
---

# Spotify Web API Integration

Use this skill for Spotify integrations.

## Focus

- Correct OAuth flow per app type
- Reliable token refresh strategy
- Safe server-side credential handling
- Practical endpoint integration patterns

## Auth decision rules

- Use Authorization Code flow for server-backed user auth.
- Use Authorization Code + PKCE for public clients.
- Use Client Credentials only for app-level data that does not require user context.
- Do not use deprecated implicit flow for new work.

## Implementation rules

- Store refresh tokens securely on the server side.
- Rotate short-lived access tokens using refresh flow before expiry.
- Keep client secret server-side only.
- Build wrappers for common endpoints (search, tracks, artists, playlists) with typed responses.

## Reliability

- Implement retries for transient failures and 429 responses.
- Log request IDs and endpoint names for debugging.
- Cache high-read metadata where appropriate.

## Quality checks before finishing

- OAuth callback and token exchange tested.
- Refresh token path verified.
- No secrets in client bundles.

## Sources

- Spotify developer docs (`/websites/developer_spotify` via Context7)
