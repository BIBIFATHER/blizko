import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const { poolQuery, verifyBearerUser, activatePaidParentRequest, verifyPaymentWithYooKassa } =
  vi.hoisted(() => ({
    poolQuery: vi.fn(),
    verifyBearerUser: vi.fn(),
    activatePaidParentRequest: vi.fn(),
    verifyPaymentWithYooKassa: vi.fn(),
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

vi.mock('./_shared.js', async () => {
  const actual = await vi.importActual<typeof import('./_shared.js')>('./_shared.js');
  return {
    ...actual,
    activatePaidParentRequest,
    verifyPaymentWithYooKassa,
  };
});

import handler from './finalize';
import { createMockResponse } from '../testUtils';

describe('api/payments/finalize handler', () => {
  beforeEach(() => {
    poolQuery.mockReset();
    verifyBearerUser.mockReset();
    activatePaidParentRequest.mockReset();
    verifyPaymentWithYooKassa.mockReset();
  });

  it('finalizes a succeeded payment and activates the parent request', async () => {
    verifyBearerUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    poolQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'payment-1',
            parent_request_id: 'parent-1',
            yk_payment_id: 'yk-1',
            status: 'pending',
            amount: '990.00',
            parent_owner_id: 'user-1',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    verifyPaymentWithYooKassa.mockResolvedValue({
      verified: true,
      status: 'succeeded',
      amount: '990.00',
    });
    activatePaidParentRequest.mockResolvedValue(true);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { paymentId: 'payment-1' },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      status: 'succeeded',
      parentRequestId: 'parent-1',
    });
    expect(poolQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE payments SET status = $1'),
      ['succeeded', 'payment-1'],
    );
    expect(activatePaidParentRequest).toHaveBeenCalledWith(expect.any(Object), 'parent-1');
  });
});
