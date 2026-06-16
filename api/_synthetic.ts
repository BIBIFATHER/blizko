/**
 * Server-side synthetic-only closed contour (until RU-core).
 *
 * While enabled, real-user admission is closed: only explicitly allow-listed
 * test phones may request/verify an OTP. Everyone else is refused. Default = ON
 * (closed); must be explicitly set to 'false' to disable, so a missing value
 * fails closed.
 */
export function isSyntheticOnly(): boolean {
  return process.env.BLIZKO_SYNTHETIC_ONLY !== 'false';
}

/**
 * Phones admitted to the closed contour (E.164). Comma-separated
 * `SYNTHETIC_TEST_PHONES` plus the designated `TEST_OTP_PHONE`. Add your own
 * test number to log in while synthetic-only is on.
 */
export function getAdmittedTestPhones(): string[] {
  const raw = process.env.SYNTHETIC_TEST_PHONES || '';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const testPhone = (process.env.TEST_OTP_PHONE || '+79000000000').trim();
  return Array.from(new Set([...list, testPhone]));
}

export function isPhoneAdmitted(phone: string): boolean {
  return getAdmittedTestPhones().includes(String(phone || '').trim());
}

/** Emails admitted server-side (comma-separated `SYNTHETIC_TEST_EMAILS`). */
export function getAdmittedTestEmails(): string[] {
  return (process.env.SYNTHETIC_TEST_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Phone-OTP users are created with a placeholder email `phone_<digits>@blizko.local`.
function phoneFromPlaceholderEmail(email: string): string | null {
  const m = /^phone_(\d+)@blizko\.local$/i.exec(String(email || '').trim());
  return m ? `+${m[1]}` : null;
}

/**
 * Whether an already-authenticated identity (by email, incl. phone-OTP
 * placeholder email) is admitted to the closed contour. Used to reject restored
 * sessions / existing JWTs at server APIs — not just new logins.
 */
export function isAdmittedIdentity(identity: { email?: string | null }): boolean {
  const email = String(identity?.email || '')
    .trim()
    .toLowerCase();
  if (!email) return false;
  if (getAdmittedTestEmails().includes(email)) return true;
  const phone = phoneFromPlaceholderEmail(email);
  return phone ? isPhoneAdmitted(phone) : false;
}

/** True when synthetic-only is ON and the identity is NOT allow-listed. */
export function identityAdmissionClosed(identity: { email?: string | null } | null): boolean {
  return isSyntheticOnly() && !isAdmittedIdentity(identity || {});
}
