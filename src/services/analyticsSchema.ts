/**
 * Blizko analytics event schema — single source of truth (BLI-116).
 *
 * Pure module with NO browser/node/Vite-specific imports, so it can be shared by
 * both the client tracker (`src/services/analytics.ts`) and the server ingest
 * (`api/data.ts`) without bundling coupling.
 *
 * Governance (DATA_REGISTER "Analytics → prohibit free-text/PII properties"):
 * analytics events may only carry an explicit per-event allowlist of property
 * keys. Anything not declared here is dropped before it leaves the client and
 * again on server ingest. On top of the key allowlist, a value-level guard drops
 * contact-like values and opaque identifiers and constrains the trusted id keys.
 */

/**
 * Allowed property keys per event. Exhaustive: every analytics event must be
 * declared here, so a new event cannot ship without choosing its safe payload.
 * Keys listed here still pass the value-level guard below.
 */
export const ANALYTICS_EVENT_PROPERTIES = {
  page_view: ['page', 'source'],
  cta_clicked: ['button', 'location'],
  form_step_completed: ['form_type', 'step', 'step_name'],
  form_submitted: ['form_type', 'offer_type', 'source'],
  matching_results_viewed: ['candidate_count', 'top_score'],
  nanny_card_clicked: ['position', 'score'],
  chat_opened: ['source'],
  booking_created: ['parent_id', 'nanny_id'],
  return_visit: ['days_since_last'],
  document_uploaded: ['owner', 'document_type'],
  location_detected: ['owner', 'method'],
  resume_parsed: ['confidence', 'applied_fields_count'],
  resume_autofill_applied: ['applied_fields_count'],
  nanny_ready_for_match: ['quality_score'],
  match_profile_opened: ['nanny_id', 'position', 'score'],
  match_follow_up_shown: ['stage'],
  match_follow_up_clicked: ['stage'],
  share_clicked: ['location'],
  auth_modal_opened: ['source'],
  auth_completed: [],
  language_switched: ['language'],
  install_prompt_shown: [],
  install_accepted: [],
  nanny_offer_shown: [],
  nanny_offer_accepted: [],
  admin_panel_opened: [],
  shortlist_delivered: ['parent_id', 'candidate_count'],
  match_outcome_recorded: ['outcome', 'parent_id', 'nanny_id', 'score_at_match'],
} as const satisfies Record<string, readonly string[]>;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENT_PROPERTIES;

/** Always-allowed keys injected by the tracker, independent of the event. */
export const ANALYTICS_GLOBAL_PROPERTY_KEYS: readonly string[] = ['session_id'];

// ---- Value-level guards (defense-in-depth on top of the key allowlist) ----

const ANALYTICS_VALUE_MAX_LEN = 120;
const ANALYTICS_EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const ANALYTICS_PHONE_RE = /\+?\d[\d\s()-]{6,}\d/;
const ANALYTICS_LONG_ID_RE = /\b\d{9,}\b/;
// Substring match: drops values that merely contain a UUID under ordinary keys.
const ANALYTICS_UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
// Whole-value match: a trusted correlation id must BE a UUID, not contain one.
const ANALYTICS_UUID_FULL_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANALYTICS_SAFE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

// Server-issued correlation ids for the matching-outcomes learning loop:
// accepted only as a whole UUID.
const ANALYTICS_CORRELATION_ID_KEYS = new Set(['parent_id', 'nanny_id']);
// System-generated session identifier: passes a safe-id shape.
const ANALYTICS_RESERVED_ID_KEYS = new Set(['session_id']);

/** Apply the value-level guard to a single already-key-allowed property value. */
function valueIsAllowed(lowerKey: string, value: unknown): { ok: boolean; value?: unknown } {
  if (typeof value === 'number')
    return Number.isFinite(value) ? { ok: true, value } : { ok: false };
  if (typeof value === 'boolean') return { ok: true, value };
  if (typeof value !== 'string') return { ok: false }; // drop objects, arrays, null, etc.

  const v = value.trim();
  if (!v || v.length > ANALYTICS_VALUE_MAX_LEN) return { ok: false };

  if (ANALYTICS_RESERVED_ID_KEYS.has(lowerKey)) {
    return ANALYTICS_SAFE_ID_RE.test(v) ? { ok: true, value: v } : { ok: false };
  }
  if (ANALYTICS_CORRELATION_ID_KEYS.has(lowerKey)) {
    return ANALYTICS_UUID_FULL_RE.test(v) ? { ok: true, value: v } : { ok: false };
  }
  if (
    ANALYTICS_EMAIL_RE.test(v) ||
    ANALYTICS_PHONE_RE.test(v) ||
    ANALYTICS_LONG_ID_RE.test(v) ||
    ANALYTICS_UUID_RE.test(v)
  ) {
    return { ok: false };
  }
  return { ok: true, value: v };
}

/**
 * Sanitize event properties: keep only keys allowed for `event` (plus globals),
 * then apply the value-level guard. Unknown event or unknown key → dropped.
 */
export function sanitizeEventProperties(
  event: string,
  properties?: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!properties || typeof properties !== 'object') return out;

  const allowedForEvent = (ANALYTICS_EVENT_PROPERTIES as Record<string, readonly string[]>)[event];
  if (!allowedForEvent) return out; // unknown event → drop everything

  const allowedKeys = new Set<string>([...allowedForEvent, ...ANALYTICS_GLOBAL_PROPERTY_KEYS]);

  for (const [key, value] of Object.entries(properties)) {
    if (!allowedKeys.has(key)) continue;
    const decision = valueIsAllowed(key.toLowerCase(), value);
    if (decision.ok) out[key] = decision.value;
  }
  return out;
}
