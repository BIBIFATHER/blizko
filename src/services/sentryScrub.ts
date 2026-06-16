/**
 * Sentry payload scrubbing (BLI-110 / DATA_REGISTER "Security/error logs →
 * payload scrubbing must be verified").
 *
 * Sentry is an external processor (DE ingest). Error events, breadcrumbs and
 * request/transaction context can otherwise carry personal data: addresses in
 * geocode URLs, phone/OTP in auth URLs, emails in messages, opaque ids. These
 * helpers redact contact-like values and strip URL query/hash before anything
 * leaves the browser. Pure and dependency-free so they are unit-testable.
 *
 * Scope: this governs the browser error-event payload. Performance tracing and
 * Session Replay are DISABLED until RU-core (see src/main.tsx) rather than
 * scrubbed, because their span/DOM payloads are a broad PD surface for a
 * passport/medical/child app. Server-side (api/ -> Vercel logs) is separate.
 */
import type { ErrorEvent, Breadcrumb } from '@sentry/react';

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /\+?\d[\d\s()-]{6,}\d/g;
const LONG_ID_RE = /\b\d{9,}\b/g;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Redact contact-like values and opaque identifiers from free text. Phone runs
 * before the bare-id pass so a compact `+7999…` is labelled `[phone]` with no
 * leftover `+`. */
export function scrubText(input: string): string {
  if (!input) return input;
  return input
    .replace(EMAIL_RE, '[email]')
    .replace(UUID_RE, '[uuid]')
    .replace(PHONE_RE, '[phone]')
    .replace(LONG_ID_RE, '[id]');
}

/** Drop query string and fragment from a URL (they carry addresses, tokens). */
export function scrubUrl(url: string): string {
  if (!url) return url;
  const cut = url.search(/[?#]/);
  const base = cut >= 0 ? url.slice(0, cut) : url;
  return scrubText(base);
}

/** Recursively redact string leaves of an arbitrary value (depth-capped). */
function scrubDeep(value: unknown, depth = 0): unknown {
  if (depth > 6) return undefined;
  if (typeof value === 'string') return scrubText(value);
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = scrubDeep(v, depth + 1);
    return out;
  }
  return value;
}

/**
 * beforeBreadcrumb hook. Console breadcrumbs may echo logged PD and are dropped.
 * Navigation / fetch / xhr URLs are stripped of query and fragment. Messages are
 * redacted. Returning null drops the breadcrumb.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === 'console') return null;

  const out: Breadcrumb = { ...breadcrumb };
  if (typeof out.message === 'string') out.message = scrubText(out.message);

  if (out.data && typeof out.data === 'object') {
    const data: Record<string, unknown> = { ...out.data };
    for (const key of ['url', 'from', 'to']) {
      if (typeof data[key] === 'string') data[key] = scrubUrl(data[key] as string);
    }
    out.data = data;
  }
  return out;
}

/**
 * beforeSend hook. Redacts message/exception, strips the request (url + drops
 * body/headers/cookies/query), drops the user entirely (no browser-side id until
 * RU-core), scrubs the transaction name and any app-set contexts/tags/extra/
 * fingerprint, deletes server_name, and scrubs breadcrumbs. Always keeps the
 * event (never returns null).
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (typeof event.message === 'string') event.message = scrubText(event.message);
  if (typeof event.transaction === 'string') event.transaction = scrubUrl(event.transaction);

  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (typeof ex.value === 'string') ex.value = scrubText(ex.value);
    }
  }

  if (event.request) {
    if (typeof event.request.url === 'string') event.request.url = scrubUrl(event.request.url);
    delete event.request.query_string;
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
  }

  // Drop the user entirely: a Supabase user id is a stable pseudonymous
  // identifier and is not needed in browser error reports before RU-core.
  delete event.user;
  delete event.server_name;

  if (event.contexts) {
    const contexts: Record<string, unknown> = {};
    for (const [key, ctx] of Object.entries(event.contexts)) {
      // Preserve the SDK trace context for correlation; scrub everything else.
      contexts[key] = key === 'trace' ? ctx : (scrubDeep(ctx) as typeof ctx);
    }
    event.contexts = contexts as ErrorEvent['contexts'];
  }

  if (event.tags) event.tags = scrubDeep(event.tags) as ErrorEvent['tags'];
  if (event.extra) event.extra = scrubDeep(event.extra) as ErrorEvent['extra'];
  if (Array.isArray(event.fingerprint)) event.fingerprint = event.fingerprint.map(scrubText);

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((b): b is Breadcrumb => b !== null);
  }

  return event;
}
