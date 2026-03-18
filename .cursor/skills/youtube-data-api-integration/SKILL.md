---
name: youtube-data-api-integration
description: Use for YouTube Data API v3 integration tasks in this project, including credential model selection, quota-aware endpoint usage, pagination, and response shaping.
---

# YouTube Data API Integration

Use this skill for YouTube API features.

## Focus

- API key vs OAuth credential choice
- Quota-aware request design
- Correct pagination handling
- Stable integration contracts for app use

## Auth and credential rules

- Use API key for public read-only data when user identity is not required.
- Use OAuth 2.0 for user-authorized operations.
- Keep API keys and OAuth secrets server-side when possible.

## Endpoint patterns

- Use `search.list` for discovery.
- Use `videos.list`, `channels.list`, and `playlistItems.list` for detailed retrieval.
- Always handle `nextPageToken` for multi-page responses.

## Quota and reliability

- Request only needed `part` fields.
- Avoid duplicate fetches and unnecessary polling.
- Backoff on quota and transient failures.

## Quality checks before finishing

- Credential type matches endpoint behavior.
- Pagination tested across at least two pages.
- Quota-impacting paths measured or logged.

## Sources

- YouTube Data API docs (`/websites/developers_google_youtube_v3` via Context7)
