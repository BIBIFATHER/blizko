# Blizko — MCP Stack

_Created: 2026-03-26_

## Current State

Configured now:

- `figma` (global Codex config)
- `notion` (global Codex config)
- `linear` (global Codex config)
- `github` (global Codex config)
- `supabase` (global Codex config, read-only limited mode)
- `stitch`

Verified from this Codex session:

- `figma` responds and exposes MCP resources
- `notion` is configured, but current OAuth refresh is invalid
- `supabase` is reachable, but current client reports auth required and does not expose a working auth flow for it
- `github` is reachable, but current client reports unsupported auth for this server
- `linear` is configured, but the endpoint times out during handshake from the current client

This means the base layer is partially real, not fully operational yet. The main remaining work is authentication, project scoping, and deciding which servers should stay global vs workspace-local.

## Current Diagnosis

- `figma`: healthy in the current Codex session
- `notion`: OAuth login now works again after Codex CLI upgrade
- `github`: now configured for bearer-token auth via `GITHUB_TOKEN`
- `supabase`: now configured for bearer-token auth via `SUPABASE_ACCESS_TOKEN`
- `linear`: current client now shows `Not logged in`, but OAuth login does not persist credentials in this environment

## Priority Order

### P1: Critical

- Figma
- GitHub
- Linear
- Supabase

### P2: High Leverage

- Notion
- Playwright / browser automation
- Sentry

### P3: Nice To Have

- Research connector
- Analytics connector
- Deployment connector

## Why Each One Matters

### GitHub

- PR review
- issues and repo context
- branch / CI visibility

### Linear

- task capture
- roadmap linkage
- status updates without manual context switching

### Figma

- design-to-code workflow
- screenshot-driven implementation
- design system asset reuse

### Supabase

- schema inspection
- auth / RLS workflows
- safer data operations

Current setup note:

- configured in read-only limited mode to reduce risk before project-specific hardening

### Notion

- specs
- product docs
- research memory

### Sentry

- real production signal
- bug triage
- post-release follow-up

## Integration Policy

- Add integrations only when they improve execution speed or quality.
- Prefer read-mostly integrations first.
- Keep secrets out of git and store setup steps in local environment docs.
- Avoid half-configured MCP entries that create noise without capability.
- Prefer global Codex config for reusable services and workspace `.mcp.json` for repo-specific local servers.

## Definition Of Done

The workspace is "MCP-ready" when:

- core product systems are reachable without leaving the terminal
- each major workflow has one clear source of truth
- credentials are stored safely and documented locally
- the agent can move from research to implementation to verification with minimal manual glue
- configured servers are not just present in config but also validated from the active client
