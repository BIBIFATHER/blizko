/**
 * Sentry payload scrubbing (BLI-110 / DATA_REGISTER "Security/error logs →
 * payload scrubbing must be verified").
 *
 * Sentry is an external processor (DE ingest). Error events, breadcrumbs and
 * request context can otherwise carry personal data: addresses in geocode URLs,
 * phone/OTP in auth URLs, emails in messages, opaque ids. These helpers redact
 * contact-like values and strip URL query/hash before anything leaves the
 * browser. Pure and dependency-free so they are unit-testable.
 */
import type { ErrorEvent, Breadcrumb } from '@sentry/react';

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /\+?\d[\d\s()-]{6,}\d/g;
const LONG_ID_RE = /\b\d{9,}\b/g;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Redact contact-like values and opaque identifiers from free text. */
export function scrubText(input: string): string {
  if (!input) return input;
  return input
    .replace(EMAIL_RE, '[email]')
    .replace(UUID_RE, '[uuid]')
    .replace(LONG_ID_RE, '[id]')
    .replace(PHONE_RE, '[phone]');
}

/** Drop query string and fragment from a URL (they carry addresses, tokens). */
export function scrubUrl(url: string): string {
  if (!url) return url;
  const cut = url.search(/[?#]/);
  const base = cut >= 0 ? url.slice(0, cut) : url;
  return scrubText(base);
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
 * beforeSend hook. Redacts message and exception values, strips request URL and
 * drops request body/headers/cookies, removes user PII (keeps only an id), and
 * scrubs breadcrumbs. Returning null would drop the event; we always keep it.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (typeof event.message === 'string') event.message = scrubText(event.message);

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

  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : {};
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((b): b is Breadcrumb => b !== null);
  }

  return event;
}
