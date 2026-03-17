import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../_cors.js';
import { verifyBearerUser } from '../_auth.js';
import { getDbPool } from '../_db.js';
import { activatePaidParentRequest, isAllowedPaymentStatus, verifyPaymentWithYooKassa } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const verifiedUser = await verifyBearerUser(req);
  if (!verifiedUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const paymentId = String(req.body?.paymentId || '').trim();
  if (!paymentId) {
    return res.status(400).json({ error: 'Missing paymentId' });
  }

  try {
    const pool = getDbPool();
    const result = await pool.query(
      `SELECT p.id,
              p.parent_request_id,
              p.yk_payment_id,
              p.status,
              p.amount,
              pr.user_id AS parent_owner_id
         FROM payments p
         LEFT JOIN parents pr ON pr.id = p.parent_request_id
        WHERE p.id = $1
        LIMIT 1`,
      [paymentId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = result.rows[0];
    if (payment.parent_owner_id && String(payment.parent_owner_id) !== verifiedUser.id) {
      return res.status(403).json({ error: 'Payment does not belong to this user' });
    }

    if (!payment.yk_payment_id) {
      return res.status(409).json({ error: 'Payment provider id missing' });
    }

    const verification = await verifyPaymentWithYooKassa(String(payment.yk_payment_id));
    if (!verification || !verification.status || !isAllowedPaymentStatus(verification.status)) {
      return res.status(200).json({
        ok: false,
        status: payment.status,
        parentRequestId: payment.parent_request_id || null,
      });
    }

    if (verification.amount && Number(verification.amount) !== Number(payment.amount)) {
      return res.status(409).json({ error: 'Amount mismatch' });
    }

    const realStatus = verification.status;
    if (realStatus !== payment.status) {
      await pool.query(
        `UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2`,
        [realStatus, payment.id],
      );
    }

    if (realStatus === 'succeeded' && payment.parent_request_id) {
      await activatePaidParentRequest(pool, String(payment.parent_request_id));
    }

    return res.status(200).json({
      ok: true,
      status: realStatus,
      parentRequestId: payment.parent_request_id || null,
    });
  } catch (error) {
    console.error('Payment finalization error:', error);
    return res.status(200).json({ ok: false, error: 'finalization_failed' });
  }
}
