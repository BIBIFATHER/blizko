# Jurisdiction Router MVP (BLI-110)

Date: 2026-06-16
Status: foundation implemented; stateless AI egress guard connected; not yet
connected to real-user admission or data-plane routing

## Scope

BLI-110 starts the server-side Jurisdiction Router as a pure, testable policy
resolver. It does not open real-user admission and does not switch storage,
payments, AI, or Supabase data planes.

## Policy Matrix

| Jurisdiction | Data plane | Collection | External AI on personal data | Sensitive flows |
| --- | --- | --- | --- | --- |
| `RU` | `ru-core` | full only after current consent | blocked until cross-border gate | blocked until separately approved |
| `UNKNOWN` | `none` | minimal | blocked | blocked |
| `EU` | `none` | none | blocked | blocked |

## Server-Side Signals

The router accepts only verified server-side country signals for the decision:

- OTP-verified phone country;
- declared residency country recorded by the server;
- declared citizenship country recorded by the server;
- service country configuration.

IP country, locale, and timezone are advisory-only. They are minimized for audit
and cannot select a weaker policy.

## Fail-Closed Rules

- Missing verified country signals -> `UNKNOWN`.
- Unsupported country -> `UNKNOWN`.
- Conflicting RU applicability (for example `RU` phone plus `DE` residency) ->
  `UNKNOWN` until reviewed.
- Verified RU-only signals -> `RU`.
- Verified EU-only signals -> `EU` placeholder with no personal-data plane.

## Implementation

- `api/_jurisdiction.ts` defines `JurisdictionPolicy`, the MVP policy table,
  phone-country inference for supported E.164 numbers, and the resolver.
- `api/_jurisdiction.test.ts` locks the fail-closed matrix and advisory-only
  behavior.
- `api/_aiEgress.ts` applies the policy as a stateless external-AI egress guard.
  While synthetic-only is ON, allow-listed test identities can keep using AI on
  fictional data. When synthetic-only is OFF, external AI on personal data is
  blocked for `UNKNOWN` / `EU`; `RU` remains blocked until
  `BLIZKO_CROSS_BORDER_AI_GATE_OPEN=true` after the separate cross-border gate.
  Current AI endpoints are sensitive-capable (documents, child/family context),
  so they also require `BLIZKO_SENSITIVE_AI_FLOW_GATE_OPEN=true`.
- `api/_notificationEgress.ts` applies the same stateless pattern to external
  notification processors. `/api/notify` and the AI-support Telegram human
  handoff stay closed for real personal-data notification flows unless
  `BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN=true`.
  This gate currently applies only to authenticated bearer flows with an
  inferable RU phone identity. Internal-token/server-originated notification
  calls have no subject identity in this stateless slice and remain fail-closed
  in real-data mode even when the gate is open.
- Notification egress currently keys jurisdiction from the authenticated sender,
  not from the notification recipient/data subject. Recipient-level routing
  belongs to a later slice after subject jurisdiction can be resolved without
  adding a new personal-data store. Before
  `BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN` is enabled for real data, the
  legal/security gate must explicitly ratify this limitation or replace it with
  subject-level routing.
- If the AI-support Telegram human handoff is blocked by notification policy,
  the user-facing escalation reply still succeeds while no external Telegram
  alert is sent. This is the current fail-closed tradeoff; a later real-data
  workflow should add an in-contour staff queue before relying on the copy.

## Next Integration Steps

- Continue stateless enforcement before persistence: add no-new-PD-write guards
  to the next egress/write surfaces.
- Persist the signed policy decision at/after Auth only after the RU data-plane
  decision and legal/security gates are explicit.
- Add audit storage for policy version, reasons, and minimized advisory signals
  only after the storage location is approved.
- Keep `UNKNOWN` and `EU` on `dataPlane: none` until the matching data plane and
  legal gates exist.
