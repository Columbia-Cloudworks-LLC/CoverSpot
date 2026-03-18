# GitHub Repository Files

This directory contains repository automation, contribution standards, and AI assistant guidance.

## Included Files

- `workflows/ci.yml`: Runs lint and production build on pushes and pull requests.
- `workflows/dependency-audit.yml`: Runs a scheduled and on-demand dependency vulnerability audit.
- `CONTRIBUTING.md`: Development and pull request guidelines for contributors.
- `pull_request_template.md`: Standard pull request checklist.
- `copilot-instructions.md`: Shared repository instructions for GitHub Copilot.

## Maintenance Notes

- Keep workflows minimal and fast; avoid adding heavy checks without team agreement.
- Prefer pinning action major versions (for example, `actions/checkout@v5`).
- If project scripts change, update workflow commands and docs together.
