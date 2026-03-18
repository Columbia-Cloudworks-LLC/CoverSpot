---
name: google-gemini-api-integration
description: Use for Google Gemini API integration in this project, including model selection, structured outputs, tool calling, safety settings, and server-side key handling.
---

# Google Gemini API Integration

Use this skill for Gemini API features.

## Focus

- Correct model and API surface selection
- Structured JSON outputs for reliable downstream logic
- Safe API key handling and server-side execution
- Practical safety and error handling defaults

## Core implementation rules

- Keep Gemini API key in server-side environment variables only.
- Prefer structured output schemas for machine-consumable responses.
- Use function/tool calling when app actions depend on model decisions.
- Validate generated JSON against schema before use.

## Model usage guidance

- Use faster/cheaper models for iterative UI and non-critical tasks.
- Use stronger models for complex reasoning or high-stakes output quality.
- Track latency and token usage for each major route.

## Reliability and safety

- Implement retries and timeout controls.
- Add guardrails for unsafe or malformed output.
- Log model name and request purpose for observability.

## Quality checks before finishing

- Schema-constrained path tested with valid and invalid inputs.
- Key is never exposed to client code.
- Fallback behavior exists for model failure/timeouts.

## Sources

- Gemini docs (`/websites/ai_google_dev_gemini-api` via Context7)
