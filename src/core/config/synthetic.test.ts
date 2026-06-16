import { afterEach, describe, expect, it, vi } from 'vitest';

import { isEmailAdmitted, isIdentityAdmitted, isSyntheticOnly } from './synthetic';

afterEach(() => vi.unstubAllEnvs());

describe('synthetic-only client config', () => {
  it('isSyntheticOnly defaults ON and disables only on literal "false"', () => {
    vi.stubEnv('VITE_SYNTHETIC_ONLY', '');
    expect(isSyntheticOnly()).toBe(true);
    vi.stubEnv('VITE_SYNTHETIC_ONLY', 'false');
    expect(isSyntheticOnly()).toBe(false);
  });

  it('admits only allow-listed emails (case-insensitive), empty list = closed', () => {
    vi.stubEnv('VITE_SYNTHETIC_TEST_EMAILS', 'Tester@Example.com, dev@blizko.local');
    expect(isEmailAdmitted('tester@example.com')).toBe(true);
    expect(isEmailAdmitted('DEV@blizko.local')).toBe(true);
    expect(isEmailAdmitted('real.user@gmail.com')).toBe(false);

    vi.stubEnv('VITE_SYNTHETIC_TEST_EMAILS', '');
    expect(isEmailAdmitted('tester@example.com')).toBe(false);
  });

  it('isIdentityAdmitted admits a restored session by email or phone', () => {
    vi.stubEnv('VITE_SYNTHETIC_TEST_EMAILS', 'dev@example.com');
    vi.stubEnv('VITE_SYNTHETIC_TEST_PHONES', '+79991112233');
    expect(isIdentityAdmitted({ email: 'dev@example.com' })).toBe(true);
    expect(isIdentityAdmitted({ phone: '+79991112233' })).toBe(true);
    expect(isIdentityAdmitted({ email: 'phone_79991112233@blizko.local' })).toBe(true);
    expect(isIdentityAdmitted({ email: 'real.user@gmail.com', phone: '+70001112233' })).toBe(false);
    expect(isIdentityAdmitted({})).toBe(false);
  });
});
