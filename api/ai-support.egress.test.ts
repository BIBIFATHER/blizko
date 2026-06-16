import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

vi.mock('./_cors.js', () => ({
  setCors: vi.fn(),
}));

vi.mock('./_rate-limit.js', () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
}));

import handler from './ai-support';
import { createMockResponse } from './_testUtils';

describe('api/ai-support jurisdiction egress guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BLIZKO_SYNTHETIC_ONLY: 'false',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      GEMINI_API_KEY: 'gemini-key',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('blocks external AI after auth but before Gemini/context fetches when jurisdiction is UNKNOWN', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://example.supabase.co/auth/v1/user') {
        return {
          ok: true,
          json: async () => ({ id: 'user-1', email: 'real.user@example.com' }),
        };
      }

      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { ticketId: 'test', message: 'This may contain personal data' },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'External AI on personal data is blocked by jurisdiction policy.',
      jurisdiction: 'UNKNOWN',
      reason: 'no_verified_country_signals',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('blocks Telegram human handoff when AI gates are open but notification gate is closed', async () => {
    process.env.BLIZKO_CROSS_BORDER_AI_GATE_OPEN = 'true';
    process.env.BLIZKO_SENSITIVE_AI_FLOW_GATE_OPEN = 'true';
    process.env.BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN = 'false';
    process.env.TELEGRAM_BOT_TOKEN = 'telegram-token';
    process.env.TELEGRAM_ADMIN_CHAT_ID = 'admin-chat';
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === 'https://example.supabase.co/auth/v1/user') {
        return {
          ok: true,
          json: async () => ({ id: 'user-1', email: 'phone_79990000000@blizko.local' }),
        };
      }

      if (url.includes('/rest/v1/support_tickets?id=eq.ticket-1&family_id=eq.user-1')) {
        return { ok: true, json: async () => [{ id: 'ticket-1' }] };
      }

      if (url.includes('/rest/v1/support_messages?ticket_id=eq.ticket-1')) {
        return { ok: true, json: async () => [] };
      }

      if (url.includes('/rest/v1/parents?user_id=eq.user-1')) {
        return { ok: true, json: async () => [] };
      }

      if (url.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        reply: 'Передам человеку.',
                        sentiment: 0,
                        needs_human: true,
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        };
      }

      if (
        url === 'https://example.supabase.co/rest/v1/support_tickets?id=eq.ticket-1' &&
        init?.method === 'PATCH'
      ) {
        return { ok: true, json: async () => ({}) };
      }

      if (
        url === 'https://example.supabase.co/rest/v1/support_messages' &&
        init?.method === 'POST'
      ) {
        return { ok: true, json: async () => ({}) };
      }

      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { ticketId: 'ticket-1', message: 'Позовите оператора' },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ escalated: true });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('api.telegram.org'))).toBe(
      false,
    );
  });
});
