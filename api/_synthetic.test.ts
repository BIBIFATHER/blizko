import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getAdmittedTestPhones,
  identityAdmissionClosed,
  isAdmittedIdentity,
  isPhoneAdmitted,
  isSyntheticOnly,
} from './_synthetic.js';

afterEach(() => vi.unstubAllEnvs());

describe('synthetic-only contour (BLIZKO_SYNTHETIC_ONLY)', () => {
  it('defaults ON when the flag is absent (fail-closed)', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', '');
    expect(isSyntheticOnly()).toBe(true);
  });

  it('is disabled only by the literal string "false"', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    expect(isSyntheticOnly()).toBe(false);
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'true');
    expect(isSyntheticOnly()).toBe(true);
  });

  it('admits only allow-listed test phones + TEST_OTP_PHONE', () => {
    vi.stubEnv('SYNTHETIC_TEST_PHONES', '+79991112233, +79994445566');
    vi.stubEnv('TEST_OTP_PHONE', '+79000000000');
    expect(getAdmittedTestPhones()).toContain('+79000000000');
    expect(isPhoneAdmitted('+79991112233')).toBe(true);
    expect(isPhoneAdmitted('+79994445566')).toBe(true);
    expect(isPhoneAdmitted('+79000000000')).toBe(true);
    expect(isPhoneAdmitted('+70001234567')).toBe(false);
  });

  it('admits an authenticated identity by email or phone-placeholder email', () => {
    vi.stubEnv('SYNTHETIC_TEST_EMAILS', 'dev@example.com');
    vi.stubEnv('SYNTHETIC_TEST_PHONES', '+79991112233');
    vi.stubEnv('TEST_OTP_PHONE', '+79000000000');
    expect(isAdmittedIdentity({ email: 'dev@example.com' })).toBe(true);
    // phone-OTP placeholder email -> derived phone in the allowlist
    expect(isAdmittedIdentity({ email: 'phone_79991112233@blizko.local' })).toBe(true);
    expect(isAdmittedIdentity({ email: 'phone_70009998877@blizko.local' })).toBe(false);
    expect(isAdmittedIdentity({ email: 'real.user@gmail.com' })).toBe(false);
    expect(isAdmittedIdentity({ email: null })).toBe(false);
  });

  it('identityAdmissionClosed rejects non-allowlisted only while synthetic-only is ON', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'true');
    vi.stubEnv('SYNTHETIC_TEST_EMAILS', 'dev@example.com');
    expect(identityAdmissionClosed({ email: 'real.user@gmail.com' })).toBe(true);
    expect(identityAdmissionClosed({ email: 'dev@example.com' })).toBe(false);
    expect(identityAdmissionClosed(null)).toBe(true);
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    expect(identityAdmissionClosed({ email: 'real.user@gmail.com' })).toBe(false);
  });
});
