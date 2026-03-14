import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from '../_db.js';

const ALLOWED_STATUSES = ['pending', 'waiting_for_capture', 'succeeded', 'canceled'];

function base64Encode(str: string): string {
    return Buffer.from(str).toString('base64');
}

/**
 * Verify payment by fetching its real status from YooKassa API.
 * This prevents spoofed webhook payloads.
 */
async function verifyPaymentWithYooKassa(paymentId: string): Promise<{
    verified: boolean;
    status?: string;
    amount?: string;
} | null> {
    const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
    const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

    if (!SHOP_ID || !SECRET_KEY) {
        console.error('Cannot verify webhook: YooKassa credentials missing');
        return null;
    }

    const authHeader = `Basic ${base64Encode(`${SHOP_ID}:${SECRET_KEY}`)}`;

    try {
        const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
            headers: { 'Authorization': authHeader },
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
    } catch (e) {
        console.error('YooKassa verification request failed:', e);
        return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // YooKassa Webhooks are server-to-server, no CORS needed.

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { event, object } = req.body;

        if (!event || !object || !object.id) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        const ykPaymentId = object.id;

        // 1. Verify the payment status directly with YooKassa API (prevents spoofing)
        const verification = await verifyPaymentWithYooKassa(ykPaymentId);

        if (!verification) {
            // Cannot verify — reject silently but return 200 so YooKassa doesn't retry
            console.warn(`Could not verify webhook for payment ${ykPaymentId}`);
            return res.status(200).json({ received: true, ignored: 'Verification failed' });
        }

        const realStatus = verification.status!;

        // 2. Validate status against whitelist
        if (!ALLOWED_STATUSES.includes(realStatus)) {
            console.warn(`Unknown payment status from YooKassa: ${realStatus}`);
            return res.status(200).json({ received: true, ignored: 'Unknown status' });
        }

        const pool = getDbPool();

        // 3. Find the payment in our DB
        const findRes = await pool.query(
            `SELECT id, parent_request_id, status, amount FROM payments WHERE yk_payment_id = $1`,
            [ykPaymentId]
        );

        if (findRes.rowCount === 0) {
            console.warn(`Webhook received for unknown ykPaymentId: ${ykPaymentId}`);
            return res.status(200).json({ received: true, ignored: 'Unknown payment' });
        }

        const payment = findRes.rows[0];

        // 4. Verify amount matches what we stored
        if (verification.amount && Number(verification.amount) !== Number(payment.amount)) {
            console.error(
                `Amount mismatch for payment ${payment.id}: ` +
                `expected ${payment.amount}, got ${verification.amount}`
            );
            return res.status(200).json({ received: true, ignored: 'Amount mismatch' });
        }

        // 5. Skip if status unchanged
        if (payment.status === realStatus) {
            return res.status(200).json({ received: true, ignored: 'Status unchanged' });
        }

        // 6. Update payment status
        await pool.query(
            `UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2`,
            [realStatus, payment.id]
        );

        // 7. Side effects on success
        if (realStatus === 'succeeded' && payment.parent_request_id) {
            console.log(
                `Payment ${payment.id} for parent_request ${payment.parent_request_id} captured.`
            );
        }

        return res.status(200).json({ received: true });

    } catch (err: any) {
        console.error('Webhook error:', err);
        return res.status(500).json({ error: 'Internal server error processing webhook' });
    }
}
