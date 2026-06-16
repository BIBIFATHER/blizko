import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const { verifyBearerUser } = vi.hoisted(() => ({
  verifyBearerUser: vi.fn(),
}));

vi.mock('./_auth.js', () => ({
  verifyBearerUser,
}));

vi.mock('./_cors.js', () => ({
  setCors: vi.fn(),
}));

vi.mock('./_rate-limit.js', () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
}));

import handler from './ai';
import { createMockResponse } from './_testUtils';

describe('api/ai jurisdiction egress guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    verifyBearerUser.mockReset();
    process.env = {
      ...originalEnv,
      BLIZKO_SYNTHETIC_ONLY: 'false',
      GEMINI_API_KEY: 'gemini-key',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('blocks external AI before provider fetch when jurisdiction is UNKNOWN', async () => {
    verifyBearerUser.mockResolvedValue({ id: 'user-1', email: 'real.user@example.com' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { prompt: 'This may contain personal data' },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'External AI on personal data is blocked by jurisdiction policy.',
      jurisdiction: 'UNKNOWN',
      reason: 'no_verified_country_signals',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps RU sensitive AI blocked until separate sensitive-flow approval', async () => {
    process.env.BLIZKO_CROSS_BORDER_AI_GATE_OPEN = 'true';
    process.env.BLIZKO_SENSITIVE_AI_FLOW_GATE_OPEN = 'false';
    verifyBearerUser.mockResolvedValue({ id: 'user-1', email: 'phone_79990000000@blizko.local' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { prompt: 'Document or family context may contain sensitive personal data' },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'External AI on sensitive personal data is blocked until separate approval.',
      jurisdiction: 'RU',
      reason: 'sensitive_ai_flow_gate_closed',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
