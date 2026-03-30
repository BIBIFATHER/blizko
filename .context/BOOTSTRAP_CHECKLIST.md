# Blizko — Bootstrap Checklist

_Created: 2026-03-26_

## Status Legend

- `[x]` done
- `[~]` partial
- `[ ]` missing

## 1. Identity And Memory

- [x] `SOUL.md`
- [x] `USER.md`
- [x] `MEMORY.md`
- [x] `.context/DNA.md`
- [x] `.context/JOURNAL.md`
- [x] `.context/CHANGELOG.md`
- [x] daily memory file is current for today

## 2. Product Operating Docs

- [x] architecture docs exist
- [x] execution and runbook docs exist
- [x] release and risk docs exist
- [~] working contract exists but AI routing was not explicit
- [x] AI stack doc now added

## 3. Tooling

- [x] local frontend toolchain exists
- [x] Brewfile now includes the intended CLI baseline
- [x] `TOOLS.md` is now structured and usable
- [x] machine-specific browser, host, and shortcut notes were added to `TOOLS.md`
- [~] global productivity CLI baseline partially verified on this machine

## 4. MCP And Integrations

- [x] MCP config exists
- [x] GitHub configured in global Codex config
- [x] Linear configured in global Codex config
- [x] Notion configured in global Codex config
- [x] Supabase configured in global Codex config
- [x] Figma verified from the current Codex session
- [x] Notion re-authorized and verified from the current Codex session
- [~] GitHub and Supabase are configured for bearer-token auth but are waiting for env tokens
- [~] Linear is visible as `Not logged in`, but OAuth persistence is still unresolved
- [ ] Sentry connected
- [~] Sentry is partially configured, but runtime DSN is not active in current `.env.local`
- [ ] research connector connected
- [~] authentication and project scoping still need to be completed interactively

## 5. AI Workflow

- [x] strong local coding workflow exists
- [x] dedicated AI stack strategy now documented
- [x] Codex mirror operating protocol now exists
- [x] Codex review and release protocols now exist
- [x] decision logging shortcut now exists
- [x] zero-exception research escalation rule now documented
- [~] provider routing and fallback partially configured
- [ ] recurring research workflow connected

## 6. Rituals

- [x] heartbeat file is now operational
- [x] morning / evening / weekly rhythm now documented
- [ ] automations actually wired

## 7. What To Do Next

### First 30 Minutes

- [ ] verify GitHub MCP from the active Codex client
- [ ] verify Linear MCP from the active Codex client
- [x] verify Notion MCP from the active Codex client
- [ ] verify Supabase MCP from the active Codex client
- [x] add real local environment notes to `TOOLS.md`
- [x] create or restore `MEMORY.md` if long-term memory is intended here

### First 2 Hours

- [ ] decide whether current Codex CLI should be upgraded before relying on remote MCP auth
- [~] GitHub now uses remote MCP with bearer token; still needs token provisioning
- [ ] scope Supabase MCP to a safe dev project when project ref is chosen
- [ ] decide whether Linear should use direct remote MCP, bearer-token auth, or `mcp-remote` fallback
- [ ] configure research layer access
- [ ] connect Sentry
- [ ] turn heartbeat into actual periodic checks
- [~] install missing CLI tools from Brewfile (`fzf`, `fd`, `direnv` installed; `bun` still absent)
- [~] verify CI / deploy / production feedback loop (`test` and `build` pass, `lint` has warnings only, GitHub Actions CI added but not yet validated remotely)

### First Day

- [~] finalize AI routing and fallback policy
- [ ] prune low-value skills and dead paths
- [ ] document launch workflow from issue to deploy to postmortem
