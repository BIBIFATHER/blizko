import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const { verifyBearerUser } = vi.hoisted(() => ({
  verifyBearerUser: vi.fn(),
}));

vi.mock('./_auth.js', async () => {
  const actual = await vi.importActual<typeof import('./_auth.js')>('./_auth.js');
  return {
    ...actual,
    verifyBearerUser,
  };
});

vi.mock('./_cors.js', () => ({
  setCors: vi.fn(),
}));

vi.mock('./_rate-limit.js', () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
}));

import handler from './notify';
import { createMockResponse } from './_testUtils';

describe('api/notify jurisdiction egress guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    verifyBearerUser.mockReset();
    process.env = {
      ...originalEnv,
      BLIZKO_SYNTHETIC_ONLY: 'false',
      TELEGRAM_BOT_TOKEN: 'telegram-token',
      TELEGRAM_ADMIN_CHAT_ID: 'admin-chat',
      RESEND_API_KEY: 'resend-key',
      ADMIN_EMAILS: 'admin@example.com',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('blocks Telegram egress before Bot API fetch when jurisdiction is UNKNOWN', async () => {
    verifyBearerUser.mockResolvedValue({ id: 'user-1', email: 'real.user@example.com' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: {
        channel: 'telegram',
        event: 'admin.new_parent_request',
        text: 'Parent request with personal data',
      },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      ok: false,
      error: 'External notifications on personal data are blocked by jurisdiction policy.',
      jurisdiction: 'UNKNOWN',
      reason: 'no_verified_country_signals',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-allowlisted restored sessions in synthetic-only mode before Telegram egress', async () => {
    process.env.BLIZKO_SYNTHETIC_ONLY = 'true';
    process.env.SYNTHETIC_TEST_EMAILS = 'tester@example.com';
    verifyBearerUser.mockResolvedValue({ id: 'user-1', email: 'real.user@example.com' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: {
        channel: 'telegram',
        event: 'admin.new_parent_request',
        text: 'Parent request with personal data',
      },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      ok: false,
      error: 'Closed test contour: identity not admitted.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks admin email egress before Resend fetch when RU notification gate is closed', async () => {
    verifyBearerUser.mockResolvedValue({
      id: 'admin-1',
      email: 'phone_79990000000@blizko.local',
    });
    process.env.ADMIN_EMAILS = 'phone_79990000000@blizko.local';
    process.env.BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN = 'false';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: {
        event: 'user.parent_request_status_changed',
        to: 'parent@example.com',
        subject: 'Status changed',
        text: 'Request status changed',
      },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      ok: false,
      error:
        'External notifications on personal data are blocked until the notification gate is approved.',
      jurisdiction: 'RU',
      reason: 'external_notification_gate_closed',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps internal-token notification egress fail-closed in real mode even when the gate is open', async () => {
    process.env.NOTIFY_TOKEN = 'internal-token';
    process.env.BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN = 'true';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      headers: { 'x-notify-token': 'internal-token' },
      body: {
        channel: 'telegram',
        chat_id: 'admin-chat',
        text: 'Server-originated notification with possible personal data',
      },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      ok: false,
      error: 'External notifications on personal data are blocked by jurisdiction policy.',
      jurisdiction: 'UNKNOWN',
      reason: 'no_verified_country_signals',
    });
    expect(verifyBearerUser).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
