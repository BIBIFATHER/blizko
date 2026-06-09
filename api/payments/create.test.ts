import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const { poolQuery, verifyBearerUser } = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  verifyBearerUser: vi.fn(),
}));

vi.mock('../_cors.js', () => ({
  setCors: vi.fn(),
}));

vi.mock('../_auth.js', () => ({
  verifyBearerUser,
}));

vi.mock('../_db.js', () => ({
  getDbPool: vi.fn(() => ({
    query: poolQuery,
  })),
}));

import handler from './create';
import { createMockResponse } from '../_testUtils';

describe('api/payments/create handler', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    poolQuery.mockReset();
    verifyBearerUser.mockReset();
    process.env = {
      ...originalEnv,
      YOOKASSA_SHOP_ID: 'shop-id',
      YOOKASSA_SECRET_KEY: 'secret-key',
      APP_URL: 'https://blizko.app',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('creates a payment session for an owned parent request', async () => {
    verifyBearerUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    poolQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'parent-1', user_id: 'user-1', payload: { status: 'payment_pending' } }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'payment-1' }] })
      .mockResolvedValueOnce({ rows: [] });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'yk-1',
        status: 'pending',
        confirmation: { confirmation_url: 'https://yookassa.test/confirm' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: {
        parentRequestId: 'parent-1',
        description: 'Подбор няни',
        userPhone: '+77001234567',
      },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      id: 'payment-1',
      yk_payment_id: 'yk-1',
      confirmation_url: 'https://yookassa.test/confirm',
      status: 'pending',
      parent_request_id: 'parent-1',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(poolQuery).toHaveBeenCalledTimes(4);
  });
});
