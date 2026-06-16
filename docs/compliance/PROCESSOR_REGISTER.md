# Blizko Processor Register

Status: agent-maintained working register
Last evidence review: 2026-06-13

This register records technical evidence, not vendor marketing conclusions.
Legal status must be checked against current primary/regulator sources and
actual contracts before a `Go` decision.

| Service | Role | Data potentially received | Location evidence | Contract evidence | Retention/deletion evidence | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Supabase | Auth, Postgres, Storage, Realtime | profiles, contacts, documents, chat, transactions | Project documented as EU; verify live settings | DPA/terms not preserved in repo | Backup/deletion proof pending | `Conditional`; RU contour open |
| Vercel | frontend and API runtime | requests, JWTs, profiles, chat, payment/AI payloads, logs | Global infrastructure; exact regions pending | Terms/DPA pending | Logs/backups pending | `Conditional`; DB move alone is insufficient |
| Google Gemini | external AI | prompts, support context, document images — synthetic/fictional test data only in this phase (closed contour, no real subjects admitted) | Contractual region and recipient-country assessment pending | API data-use settings not evidenced | Retention/deletion and historical-egress remediation pending | `Synthetic-only`: real-user personal/child data forbidden until RU-core + cross-border gate + separate sensitive-flow approval; code gates are `BLIZKO_CROSS_BORDER_AI_GATE_OPEN` and `BLIZKO_SENSITIVE_AI_FLOW_GATE_OPEN`, both default closed |
| Sentry | error monitoring | errors, URL, user/context, payload fragments | CSP references DE ingest; settings need verification | Terms/DPA pending | Retention/scrubbing pending | `Conditional`; scrubbed metadata only |
| Cloudflare | proxy/CDN/analytics | IP, headers, cookies, URL, traffic metadata | Global edge; settings pending | Terms/DPA pending | Log retention pending | `Conditional`; explicit personal-data boundary |
| Yandex Metrica | browser analytics | IP, cookies, URL, configured events/properties | Account configuration pending | Terms/settings pending | Retention settings pending | `Conditional`; no free text/restricted fields |
| Resend | email delivery | email and message content | Region pending | Terms/DPA pending | Message/log retention pending | `Synthetic-only/default-closed`: real personal-data notifications require `BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN=true` and target-contour approval |
| Telegram Bot API | notifications/handoff | chat ID, message, selected support context | Processing facts pending | Processor suitability pending | Message controls limited | `Synthetic-only/default-closed`: real personal-data notifications/handoff require `BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN=true`; no restricted support content until separately approved |
| SMSAero | phone OTP/SMS | phone and service message | Provider evidence pending | Contract noted pending in `SERVICES.md` | Retention pending | `Conditional`; OTP only |
| YooKassa | payments | payment/order metadata, email/phone where configured | Verify actual merchant payload | Agreement outside repo | Statutory/provider retention pending | `Conditional`; payment-only minimization |
| HeadHunter and other recruiting source platforms | recruiting source and communication channel | source-hosted resume, profile, messages, and platform account data | Actual platform and account settings must be verified before expansion | Platform terms govern source use; no separate DPA evidence preserved | Source retention/export/deletion controls pending | `Conditional`; communicate manually and keep only a minimized encrypted local index |
| Yandex Geocoder (`geocode-maps.yandex.ru`) | external geocoding (address↔coordinates) for `/api/geocode` | free-text address query or reverse GPS `lat/lon`; synthetic test locations only in this phase | Yandex infrastructure (RU); contractual region pending | API-key terms; no DPA preserved | Provider-side retention pending | `Synthetic-only/default-closed`: real address/GPS egress requires `BLIZKO_GEOCODE_EGRESS_GATE_OPEN=true` plus processor/legal acceptance; endpoint is unauthenticated |
| Nominatim (OpenStreetMap, `nominatim.openstreetmap.org`) | external geocoding fallback for `/api/geocode` | free-text address query or reverse GPS `lat/lon`; synthetic test locations only in this phase | OSMF infrastructure (EU); settings pending | OSMF usage policy (no API key); no DPA | Provider log retention pending | `Synthetic-only/default-closed`: same gate `BLIZKO_GEOCODE_EGRESS_GATE_OPEN`; respect OSMF usage policy before real-data use |

The local nanny lead registry is an on-device component, not a processor.
Legacy `parseHhResponses.js` and `importHhNannies.js` are synthetic-only,
fail-closed utilities. Any real-resume path to Gemini or Supabase EU is
`No-Go`.

## Admission Rule

A new service cannot receive production data until the agent records exact
fields and purpose, data path and countries, contractual role/subprocessors,
retention/deletion, security/access controls, legal/security decision, and an
exit path.

Unknown mandatory evidence means `No-Go` or synthetic-data-only evaluation.

## Jurisdiction Routing

The jurisdiction resolver is an internal server-side component, not a
processor. Prefer offline or internal IP-geolocation because IP, locale, and
timezone are advisory-only and cannot select a weaker policy.

If an external IP-geolocation service is introduced, add it to this register
before production use with exact fields, countries, contract, subprocessors,
retention/deletion, and security evidence. Until that review passes, its use is
`No-Go`.
