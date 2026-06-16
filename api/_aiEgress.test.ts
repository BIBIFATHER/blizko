import { afterEach, describe, expect, it, vi } from 'vitest';

import { externalPersonalDataAiEgressDecision } from './_aiEgress.js';

afterEach(() => vi.unstubAllEnvs());

describe('externalPersonalDataAiEgressDecision', () => {
  it('allows the current synthetic-only test contour without persistence', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'true');

    const decision = externalPersonalDataAiEgressDecision({ email: 'tester@example.com' });

    expect(decision.closed).toBe(false);
    expect(decision.jurisdiction).toBe('SYNTHETIC_TEST');
    expect(decision.reason).toBe('synthetic_only_test_contour');
  });

  it('blocks external AI when synthetic-only is off and verified jurisdiction is missing', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');

    const decision = externalPersonalDataAiEgressDecision({ email: 'real.user@example.com' });

    expect(decision.closed).toBe(true);
    expect(decision.status).toBe(403);
    expect(decision.jurisdiction).toBe('UNKNOWN');
    expect(decision.reason).toBe('no_verified_country_signals');
  });

  it('blocks RU external AI until the cross-border AI gate is explicitly approved', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    vi.stubEnv('BLIZKO_CROSS_BORDER_AI_GATE_OPEN', 'false');

    const decision = externalPersonalDataAiEgressDecision({
      email: 'phone_79990000000@blizko.local',
    });

    expect(decision.closed).toBe(true);
    expect(decision.status).toBe(403);
    expect(decision.jurisdiction).toBe('RU');
    expect(decision.reason).toBe('cross_border_ai_gate_closed');
  });

  it('allows only RU external AI when the explicit cross-border gate is open', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    vi.stubEnv('BLIZKO_CROSS_BORDER_AI_GATE_OPEN', 'true');

    const ru = externalPersonalDataAiEgressDecision({
      email: 'phone_79990000000@blizko.local',
    });
    const unknown = externalPersonalDataAiEgressDecision({ email: 'real.user@example.com' });

    expect(ru.closed).toBe(false);
    expect(ru.jurisdiction).toBe('RU');
    expect(ru.reason).toBe('cross_border_ai_gate_open');
    expect(unknown.closed).toBe(true);
    expect(unknown.jurisdiction).toBe('UNKNOWN');
  });

  it('keeps sensitive RU AI flows blocked until the separate sensitive-flow gate is open', () => {
    vi.stubEnv('BLIZKO_SYNTHETIC_ONLY', 'false');
    vi.stubEnv('BLIZKO_CROSS_BORDER_AI_GATE_OPEN', 'true');
    vi.stubEnv('BLIZKO_SENSITIVE_AI_FLOW_GATE_OPEN', 'false');

    const blocked = externalPersonalDataAiEgressDecision(
      { email: 'phone_79990000000@blizko.local' },
      { sensitiveFlow: true },
    );

    vi.stubEnv('BLIZKO_SENSITIVE_AI_FLOW_GATE_OPEN', 'true');
    const allowed = externalPersonalDataAiEgressDecision(
      { email: 'phone_79990000000@blizko.local' },
      { sensitiveFlow: true },
    );

    expect(blocked.closed).toBe(true);
    expect(blocked.jurisdiction).toBe('RU');
    expect(blocked.reason).toBe('sensitive_ai_flow_gate_closed');
    expect(allowed.closed).toBe(false);
    expect(allowed.reason).toBe('cross_border_ai_gate_open');
  });
});
