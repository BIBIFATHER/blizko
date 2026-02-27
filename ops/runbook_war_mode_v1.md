# Ops Runbook — WAR MODE v1 (Nanny Funnel)

## 1) Manual review process (step‑by‑step)
1. Queue intake: new apply_submit appears (daily export)
2. Triage A/B/C within 24h
   - A: strong fit → proceed
   - B: acceptable → request more info
   - C: mismatch → reject
3. Decision: approve / need info / reject
4. Invite created (if approved)
5. Verification docs review → mark verified
6. Close loop in dashboard

## 2) SLA + war‑mode cadence
- Triage: ≤ 24h
- Verify: ≤ 48h after docs
- Response after escalation: ≤ 24h

Daily cadence:
- 10:00 — review queue
- 14:00 — backlog check
- 19:00 — daily report update (war_mode_dashboard)

## 3) Escalation matrix
- **Severity 1 (Safety risk):** Trust owner, response ≤ 12h
- **Severity 2 (Dispute):** Ops lead, response ≤ 24h
- **Severity 3 (Data issue):** Tech owner, response ≤ 24h

## 4) Support entrypoints
- Primary: in‑app AI chat (SupportChat)
- Human escalation: Ops Telegram channel / email fallback

## 5) Templates
**Need more info:**
“Спасибо! Для продолжения проверки, пожалуйста, пришлите: <список>. Мы вернёмся в течение 24 часов.”

**Approved:**
“Вы одобрены. Следующий шаг — заполнить профиль и ожидать приглашения.”

**Rejected:**
“Спасибо за заявку. Сейчас мы не можем продолжить. Можно повторить через 30 дней.”

**Escalated:**
“Ситуация требует дополнительной проверки. Мы вернёмся в течение 24 часов.”

## 6) Logging (daily)
- `memory/STATUS/war_mode_dashboard.md` — daily metrics + bottleneck
- `memory/YYYY-MM-DD.md` — decisions + incidents
