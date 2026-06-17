import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from '../_db.js';
import { rateLimit } from '../_rate-limit.js';
import {
  activatePaidParentRequest,
  isAllowedPaymentStatus,
  verifyPaymentWithYooKassa,
} from './_shared.js';
import { logError, logWarn } from '../_logScrub.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rl = rateLimit(req, { max: 30, prefix: 'yk-webhook' });
  if (!rl.ok) return res.status(429).json({ error: 'Too many requests' });

  try {
    const { event, object } = req.body || {};
    if (!event || !object || !object.id) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const ykPaymentId = String(object.id);
    const verification = await verifyPaymentWithYooKassa(ykPaymentId);

    if (!verification || !verification.status) {
      logWarn(`Could not verify webhook for payment ${ykPaymentId}`);
      return res.status(200).json({ received: true, ignored: 'verification_failed' });
    }

    const realStatus = verification.status;
    if (!isAllowedPaymentStatus(realStatus)) {
      console.warn(`Unknown payment status from YooKassa: ${realStatus}`);
      return res.status(200).json({ received: true, ignored: 'unknown_status' });
    }

    const pool = getDbPool();
    const findRes = await pool.query(
      `SELECT id, parent_request_id, status, amount
         FROM payments
        WHERE yk_payment_id = $1`,
      [ykPaymentId],
    );

    if (findRes.rowCount === 0) {
      logWarn(`Webhook received for unknown ykPaymentId: ${ykPaymentId}`);
      return res.status(200).json({ received: true, ignored: 'unknown_payment' });
    }

    const payment = findRes.rows[0];

    if (verification.amount && Number(verification.amount) !== Number(payment.amount)) {
      logError(
        `Amount mismatch for payment ${payment.id}: expected ${payment.amount}, got ${verification.amount}`,
      );
      return res.status(200).json({ received: true, ignored: 'amount_mismatch' });
    }

    if (payment.status !== realStatus) {
      await pool.query(`UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2`, [
        realStatus,
        payment.id,
      ]);
    }

    if (realStatus === 'succeeded' && payment.parent_request_id) {
      await activatePaidParentRequest(pool, String(payment.parent_request_id));
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logError('Webhook error:', error);
    // Return 5xx so YooKassa retries. A DB/activation failure after capture must not
    // be reported as success, otherwise a paid request never activates. The handler is
    // idempotent (activatePaidParentRequest no-ops once activated), so retries are safe.
    return res.status(500).json({ error: 'internal_error' });
  }
}
