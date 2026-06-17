/**
 * Server-side log PII scrubbing (BLI-110 / 152-FZ log minimization).
 *
 * Vercel function stdout/stderr is ingested by external log processors
 * (Vercel/Sentry/Cloudflare per DATA_REGISTER). Error objects and external API
 * responses (YooKassa, Gemini, Telegram, Supabase) can otherwise carry phones,
 * emails, addresses, document/chat fragments and opaque ids. These helpers
 * redact such values before anything reaches the console. Pure, dependency-free.
 *
 * Use `logError`/`logWarn` instead of `console.error`/`console.warn` whenever a
 * dynamic value (error, external payload, message) is logged. Static-string-only
 * logs need no scrubbing.
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /\+?\d[\d\s()-]{6,}\d/g;
const LONG_ID_RE = /\b\d{9,}\b/g;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Keys whose values are dropped wholesale (credentials and direct PD). */
const SENSITIVE_KEY_RE =
  /pass|token|secret|authorization|cookie|otp|phone|email|card|cvv|cvc|receipt|address|passport|fullname|full_name|first_name|last_name/i;

const MAX_STRING = 500;
const MAX_DEPTH = 5;

/** Redact contact-like values and opaque identifiers from a string. */
export function scrubLogText(input: string): string {
  if (!input) return input;
  const clipped = input.length > MAX_STRING ? input.slice(0, MAX_STRING) + '…' : input;
  return clipped
    .replace(EMAIL_RE, '[email]')
    .replace(UUID_RE, '[uuid]')
    .replace(PHONE_RE, '[phone]')
    .replace(LONG_ID_RE, '[id]');
}

/** Deep-redact an arbitrary logged value into something safe to print. */
export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return undefined;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return scrubLogText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (value instanceof Error) {
    return { name: value.name, message: scrubLogText(value.message) };
  }
  if (Array.isArray(value)) return value.map((v) => redactForLog(v, depth + 1));

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[scrubLogText(key)] = SENSITIVE_KEY_RE.test(key)
        ? '[redacted]'
        : redactForLog(v, depth + 1);
    }
    return out;
  }
  return undefined;
}

/** console.error with the dynamic value redacted. */
export function logError(label: string, value?: unknown): void {
  if (arguments.length < 2) console.error(label);
  else console.error(label, redactForLog(value));
}

/** console.warn with the dynamic value redacted. */
export function logWarn(label: string, value?: unknown): void {
  if (arguments.length < 2) console.warn(label);
  else console.warn(label, redactForLog(value));
}
