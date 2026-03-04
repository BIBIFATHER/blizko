import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../_cors.js';
import { getDbPool } from '../_db.js';

function base64Encode(str: string): string {
    return Buffer.from(str).toString('base64');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(req.headers.origin, res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { amount, parentRequestId, description, userEmail, userPhone } = req.body;

        if (!amount) {
            return res.status(400).json({ error: 'Missing amount' });
        }

        const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
        const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

        if (!SHOP_ID || !SECRET_KEY) {
            console.error('YooKassa credentials missing');
            return res.status(500).json({ error: 'Payment gateway configuration error' });
        }

        // 1. Save pending payment to our database
        let paymentRecordId: string | null = null;
        const pool = getDbPool();

        try {
            const dbRes = await pool.query(
                `INSERT INTO payments (parent_request_id, amount, currency, status, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
                [
                    parentRequestId || null,
                    amount,
                    'RUB',
                    'pending',
                    JSON.stringify({ email: userEmail, phone: userPhone, description })
                ]
            );
            paymentRecordId = dbRes.rows[0].id;
        } catch (e) {
            console.error('Failed to create payment in DB:', e);
            // We can still try to generate a link, but we won't be able to match the webhook automatically.
            // For production, maybe fail here. We'll proceed or fail based on strictness.
            return res.status(500).json({ error: 'Database error while creating payment' });
        }

        // 2. Call YooKassa API to create a payment
        const authHeader = `Basic ${base64Encode(`${SHOP_ID}:${SECRET_KEY}`)}`;
        const idempotencyKey = paymentRecordId || crypto.randomUUID();

        const returnUrl = `${req.headers.origin || 'https://blizko.app'}/success?paid=true&payment_id=${paymentRecordId}`;

        const payload: any = {
            amount: {
                value: Number(amount).toFixed(2),
                currency: 'RUB',
            },
            capture: true, // Automatically capture the payment
            confirmation: {
                type: 'redirect',
                return_url: returnUrl,
            },
            description: description || 'Оплата услуг Blizko',
            metadata: {
                paymentRecordId,
                parentRequestId: parentRequestId || '',
            }
        };

        if (userEmail || userPhone) {
            payload.receipt = {
                customer: {
                    email: userEmail,
                    phone: userPhone,
                },
                items: [
                    {
                        description: description || 'Оплата услуг Blizko',
                        quantity: '1.00',
                        amount: {
                            value: Number(amount).toFixed(2),
                            currency: 'RUB',
                        },
                        vat_code: 1, // Without VAT
                    }
                ]
            };
        }

        const response = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Idempotence-Key': idempotencyKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('YooKassa error:', data);

            // Mark as failed in our DB
            if (paymentRecordId) {
                await pool.query(`UPDATE payments SET status = 'canceled' WHERE id = $1`, [paymentRecordId]);
            }
            return res.status(response.status).json({ error: 'Payment gateway rejected the request', details: data });
        }

        // 3. Update the payment record with YooKassa's ID
        if (paymentRecordId && data.id) {
            await pool.query(
                `UPDATE payments SET yk_payment_id = $1 WHERE id = $2`,
                [data.id, paymentRecordId]
            );
        }

        // 4. Return the confirmation URL back to the frontend
        return res.status(200).json({
            id: paymentRecordId,
            yk_payment_id: data.id,
            confirmation_url: data.confirmation?.confirmation_url,
            status: data.status
        });

    } catch (err: any) {
        console.error('Payment creation error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
