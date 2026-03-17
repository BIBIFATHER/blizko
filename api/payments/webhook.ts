import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from '../_db.js';
import { activatePaidParentRequest, isAllowedPaymentStatus, verifyPaymentWithYooKassa } from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event, object } = req.body || {};
    if (!event || !object || !object.id) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const ykPaymentId = String(object.id);
    const verification = await verifyPaymentWithYooKassa(ykPaymentId);

    if (!verification || !verification.status) {
      console.warn(`Could not verify webhook for payment ${ykPaymentId}`);
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
      console.warn(`Webhook received for unknown ykPaymentId: ${ykPaymentId}`);
      return res.status(200).json({ received: true, ignored: 'unknown_payment' });
    }

    const payment = findRes.rows[0];

    if (verification.amount && Number(verification.amount) !== Number(payment.amount)) {
      console.error(
        `Amount mismatch for payment ${payment.id}: expected ${payment.amount}, got ${verification.amount}`,
      );
      return res.status(200).json({ received: true, ignored: 'amount_mismatch' });
    }

    if (payment.status !== realStatus) {
      await pool.query(
        `UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2`,
        [realStatus, payment.id],
      );
    }

    if (realStatus === 'succeeded' && payment.parent_request_id) {
      await activatePaidParentRequest(pool, String(payment.parent_request_id));
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ received: true, ignored: 'internal_error' });
  }
}
