import { afterEach, describe, expect, it, vi } from 'vitest';

import { externalPersonalDataNotificationEgressDecision } from './_notificationEgress.js';

afterEach(() => vi.unstubAllEnvs());

describe('externalPersonalDataNotificationEgressDecision', () => {
  it('allows the current synthetic-only test contour without persistence', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'true');

    const decision = externalPersonalDataNotificationEgressDecision({
      email: 'tester@example.com',
    });

    expect(decision.closed).toBe(false);
    expect(decision.jurisdiction).toBe('SYNTHETIC_TEST');
    expect(decision.reason).toBe('synthetic_only_test_contour');
  });

  it('blocks external notifications when synthetic-only is off and jurisdiction is UNKNOWN', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');

    const decision = externalPersonalDataNotificationEgressDecision({
      email: 'real.user@example.com',
    });

    expect(decision.closed).toBe(true);
    expect(decision.status).toBe(403);
    expect(decision.jurisdiction).toBe('UNKNOWN');
    expect(decision.reason).toBe('no_verified_country_signals');
  });

  it('blocks RU external notifications until the notification gate is explicitly approved', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    vi.stubEnv('BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN', 'false');

    const decision = externalPersonalDataNotificationEgressDecision({
      email: 'phone_79990000000@blizko.local',
    });

    expect(decision.closed).toBe(true);
    expect(decision.status).toBe(403);
    expect(decision.jurisdiction).toBe('RU');
    expect(decision.reason).toBe('external_notification_gate_closed');
  });

  it('allows RU external notifications only when the explicit notification gate is open', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    vi.stubEnv('BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN', 'true');

    const ru = externalPersonalDataNotificationEgressDecision({
      email: 'phone_79990000000@blizko.local',
    });
    const unknown = externalPersonalDataNotificationEgressDecision({
      email: 'real.user@example.com',
    });

    expect(ru.closed).toBe(false);
    expect(ru.jurisdiction).toBe('RU');
    expect(ru.reason).toBe('external_notification_gate_open');
    expect(unknown.closed).toBe(true);
    expect(unknown.jurisdiction).toBe('UNKNOWN');
  });
});
