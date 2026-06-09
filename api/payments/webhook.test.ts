import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const { poolQuery, verifyPaymentWithYooKassa, activatePaidParentRequest } = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  verifyPaymentWithYooKassa: vi.fn(),
  activatePaidParentRequest: vi.fn(),
}));

vi.mock('../_rate-limit.js', () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
}));

vi.mock('../_db.js', () => ({
  getDbPool: vi.fn(() => ({ query: poolQuery })),
}));

vi.mock('./_shared.js', async () => {
  const actual = await vi.importActual<typeof import('./_shared.js')>('./_shared.js');
  return {
    ...actual,
    verifyPaymentWithYooKassa,
    activatePaidParentRequest,
  };
});

import handler from './webhook';
import { createMockResponse } from '../_testUtils';

const makeReq = () =>
  ({
    method: 'POST',
    headers: {},
    body: { event: 'payment.succeeded', object: { id: 'yk-1' } },
  }) as unknown as VercelRequest;

describe('api/payments/webhook handler', () => {
  beforeEach(() => {
    poolQuery.mockReset();
    verifyPaymentWithYooKassa.mockReset();
    activatePaidParentRequest.mockReset();
  });

  it('returns 500 (not 200) on internal error so YooKassa retries (H1)', async () => {
    verifyPaymentWithYooKassa.mockResolvedValue({ status: 'succeeded', amount: '990.00' });
    // DB lookup throws AFTER capture — the failure must NOT be swallowed as success.
    poolQuery.mockRejectedValueOnce(new Error('db down'));

    const res = createMockResponse();
    await handler(makeReq(), res);

    expect(res.statusCode).toBe(500);
    expect(res.body).not.toMatchObject({ received: true });
  });

  it('returns 200 and activates on a verified succeeded payment', async () => {
    verifyPaymentWithYooKassa.mockResolvedValue({ status: 'succeeded', amount: '990.00' });
    poolQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          { id: 'payment-1', parent_request_id: 'parent-1', status: 'pending', amount: '990.00' },
        ],
      })
      .mockResolvedValueOnce({});
    activatePaidParentRequest.mockResolvedValue(true);

    const res = createMockResponse();
    await handler(makeReq(), res);

    expect(res.statusCode).toBe(200);
    expect(activatePaidParentRequest).toHaveBeenCalledWith(expect.any(Object), 'parent-1');
  });
});
