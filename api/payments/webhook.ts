import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // YooKassa Webhooks do not require CORS as they are server-to-server.

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { event, object } = req.body;

        if (!event || !object || !object.id) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        const ykPaymentId = object.id;
        const newStatus = object.status; // pending, waiting_for_capture, succeeded, canceled

        const pool = getDbPool();

        // 1. Find the payment in our DB by yk_payment_id
        const findRes = await pool.query(
            `SELECT id, parent_request_id, status FROM payments WHERE yk_payment_id = $1`,
            [ykPaymentId]
        );

        if (findRes.rowCount === 0) {
            console.warn(`Webhook received for unknown ykPaymentId: ${ykPaymentId}`);
            // Usually return 200 so YooKassa stops retrying
            return res.status(200).json({ received: true, ignored: 'Unknown payment' });
        }

        const payment = findRes.rows[0];

        // If already succeeded or canceled, we don't need to re-process unless it's a refund
        if (payment.status === newStatus) {
            return res.status(200).json({ received: true, ignored: 'Status unchanged' });
        }

        // 2. Update payment status
        await pool.query(
            `UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2`,
            [newStatus, payment.id]
        );

        // 3. If succeeded, we can update parent_requests or notify admins
        if (newStatus === 'succeeded' && payment.parent_request_id) {
            // (Optional) Mark parent_requests as paid
            // await pool.query(`UPDATE parent_requests SET status = 'paid' WHERE id = $1`, [payment.parent_request_id]);

            console.log(`Payment ${payment.id} for parent_request ${payment.parent_request_id} successfully captured.`);
        }

        return res.status(200).json({ received: true });

    } catch (err: any) {
        console.error('Webhook error:', err);
        return res.status(500).json({ error: 'Internal server error processing webhook' });
    }
}
