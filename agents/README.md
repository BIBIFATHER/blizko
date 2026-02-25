# agents/ (Legacy UI mirror) — Stage 0

## What this is
This folder is a legacy UI mirror of agent profiles.

## Source of truth
Canonical agent profiles live in:
- AGENT_PROFILES/agents/*.md

Legacy files are generated here as:
- agents/*.prompt.md

## Rules (locked)
- Do NOT edit agents/*.prompt.md manually.
- Update agents only in AGENT_PROFILES/agents/, then run sync.

## Sync
Run:
- bash scripts/sync_agents.sh

## UI refresh
If the UI caches the agent list:
- restart the bot/UI process that reads agents/*.prompt.md
- verify with: ls -la agents/*.prompt.md

## Reference
- core/AGENT_SYNC_POLICY.md
- core/AGENTS_MANIFEST.json
