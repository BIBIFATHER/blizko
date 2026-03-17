import type { Pool } from 'pg';

export const MATCHING_FEE_RUB = 990;
const ALLOWED_PAYMENT_STATUSES = ['pending', 'waiting_for_capture', 'succeeded', 'canceled'] as const;

function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}

export function isAllowedPaymentStatus(status: string): status is (typeof ALLOWED_PAYMENT_STATUSES)[number] {
  return ALLOWED_PAYMENT_STATUSES.includes(status as (typeof ALLOWED_PAYMENT_STATUSES)[number]);
}

export async function verifyPaymentWithYooKassa(paymentId: string): Promise<{
  verified: boolean;
  status?: string;
  amount?: string;
} | null> {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    console.error('Cannot verify payment: YooKassa credentials missing');
    return null;
  }

  const authHeader = `Basic ${base64Encode(`${shopId}:${secretKey}`)}`;

  try {
    const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
      headers: { Authorization: authHeader },
    });

    if (!res.ok) {
      console.error(`YooKassa verification failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return {
      verified: true,
      status: data.status,
      amount: data.amount?.value,
    };
  } catch (error) {
    console.error('YooKassa verification request failed:', error);
    return null;
  }
}

export async function activatePaidParentRequest(pool: Pool, parentRequestId: string): Promise<boolean> {
  const parentResult = await pool.query(
    `SELECT id, payload FROM parents WHERE id = $1`,
    [parentRequestId],
  );

  if (parentResult.rowCount === 0) {
    console.warn(`Paid parent request not found: ${parentRequestId}`);
    return false;
  }

  const row = parentResult.rows[0];
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
  const currentStatus = String(payload.status || '');

  if (currentStatus && currentStatus !== 'payment_pending' && currentStatus !== 'new') {
    return true;
  }

  const now = Date.now();
  const updatedPayload = {
    ...payload,
    status: 'new',
    updatedAt: now,
    paymentDraftKey: undefined,
    changeLog: [
      ...(Array.isArray(payload.changeLog) ? payload.changeLog : []),
      {
        at: now,
        type: 'status_changed',
        by: 'user',
        note: 'Оплата подтверждена, заявка отправлена в работу',
      },
    ],
  };

  delete updatedPayload.paymentDraftKey;

  await pool.query(
    `UPDATE parents SET payload = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(updatedPayload), parentRequestId],
  );

  return true;
}
