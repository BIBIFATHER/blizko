/**
 * Synthetic-only closed contour.
 *
 * Until RU-core is ready, Blizko runs as a closed development/staging environment
 * on synthetic data only: real users, real personal data, and production payments
 * are not admitted. Product functionality (forms, photo, documents, video, AI,
 * matching, chat, support, admin, bookings, notifications) stays fully enabled
 * for testing on fictional data.
 *
 * This is an infrastructure/config switch, not a product change. After RU-core
 * readiness and an explicit owner Go, set `VITE_SYNTHETIC_ONLY=false` (client)
 * and `BLIZKO_SYNTHETIC_ONLY=false` (server) and open admission — no UI or
 * business-logic rewrite is required.
 *
 * Default = ON (closed). The flag must be explicitly set to the string 'false'
 * to disable, so a missing/misconfigured value fails closed.
 */
export function isSyntheticOnly(): boolean {
  return import.meta.env.VITE_SYNTHETIC_ONLY !== 'false';
}

/**
 * Emails admitted to the closed contour (comma-separated `VITE_SYNTHETIC_TEST_EMAILS`).
 * Email magic-link sign-in goes directly to Supabase Auth, so this gate is
 * enforced client-side as defense-in-depth; the hard enforcement is the Supabase
 * Auth project config (open email signups disabled / restricted) and must be set
 * before real users could reach the app. Default empty = email admission closed.
 */
export function admittedTestEmails(): string[] {
  return (import.meta.env.VITE_SYNTHETIC_TEST_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAdmitted(email: string): boolean {
  return admittedTestEmails().includes(
    String(email || '')
      .trim()
      .toLowerCase(),
  );
}

/** Phones admitted to the closed contour (comma-separated `VITE_SYNTHETIC_TEST_PHONES`). */
export function admittedTestPhones(): string[] {
  return (import.meta.env.VITE_SYNTHETIC_TEST_PHONES || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
}

/**
 * Whether an already-authenticated identity is admitted to the closed contour.
 * Used to sign out non-allow-listed restored sessions (defense-in-depth; the
 * hard enforcement is Supabase-side session revocation / Auth config).
 */
export function isIdentityAdmitted(identity: {
  email?: string | null;
  phone?: string | null;
}): boolean {
  const email = String(identity.email || '')
    .trim()
    .toLowerCase();
  if (email && admittedTestEmails().includes(email)) return true;
  const m = /^phone_(\d+)@blizko\.local$/i.exec(email);
  const phone = identity.phone || (m ? `+${m[1]}` : null);
  return phone ? admittedTestPhones().includes(String(phone).trim()) : false;
}
