import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ParentRequest } from '../../src/core/types/types.js';
import { setCors } from '../_cors.js';
import { verifyBearerUser } from '../_auth.js';
import { getDbPool } from '../_db.js';
import { MATCHING_FEE_RUB } from './_shared.js';

type ParentRequestDraftInput = Omit<ParentRequest, 'id' | 'createdAt' | 'updatedAt' | 'type' | 'status' | 'changeLog' | 'requesterId' | 'requesterEmail'>;

function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}

function asOptionalString(value: unknown, max = 200): string | undefined {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function asRequiredString(value: unknown, field: string, max = 5000): string {
  const normalized = String(value || '').trim().slice(0, max);
  if (!normalized) {
    throw new Error(`Missing field: ${field}`);
  }
  return normalized;
}

function asStringArray(value: unknown, maxItems = 20, itemMax = 120): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim().slice(0, itemMax))
    .filter(Boolean)
    .slice(0, maxItems);
}

function asJsonObject<T extends object>(value: unknown): T | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : undefined;
}

function sanitizeParentRequestDraft(
  input: unknown,
  owner: { id: string; email: string | null },
): Omit<ParentRequest, 'id' | 'createdAt' | 'updatedAt' | 'type' | 'changeLog'> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Missing parent request draft');
  }

  const raw = input as Record<string, unknown>;

  return {
    city: asRequiredString(raw.city, 'city', 120),
    district: asOptionalString(raw.district, 120),
    metro: asOptionalString(raw.metro, 120),
    childAge: asRequiredString(raw.childAge, 'childAge', 80),
    schedule: asRequiredString(raw.schedule, 'schedule', 200),
    budget: asRequiredString(raw.budget, 'budget', 200),
    requirements: asStringArray(raw.requirements, 30, 120),
    comment: asRequiredString(raw.comment, 'comment', 10_000),
    documents: Array.isArray(raw.documents) ? raw.documents.slice(0, 20) as ParentRequestDraftInput['documents'] : undefined,
    riskProfile: asJsonObject<NonNullable<ParentRequest['riskProfile']>>(raw.riskProfile),
    status: 'payment_pending',
    requesterId: owner.id,
    requesterEmail: owner.email || undefined,
    rejectionInfo: undefined,
    isNannySharing: false,
  };
}

async function ensureOwnedParentRequest(
  parentRequestId: string,
  ownerUserId: string,
): Promise<{ id: string; payload: any } | null> {
  const pool = getDbPool();
  const result = await pool.query(
    `SELECT id, user_id, payload FROM parents WHERE id = $1`,
    [parentRequestId],
  );

  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  if (String(row.user_id || '') !== ownerUserId) {
    throw new Error('FORBIDDEN_PARENT_REQUEST');
  }

  return { id: row.id, payload: row.payload };
}

async function findDraftRequestByKey(draftKey: string, ownerUserId: string): Promise<{ id: string; payload: any } | null> {
  const pool = getDbPool();
  const result = await pool.query(
    `SELECT id, payload
       FROM parents
      WHERE user_id = $1
        AND payload->>'paymentDraftKey' = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [ownerUserId, draftKey],
  );

  if (result.rowCount === 0) return null;
  return { id: result.rows[0].id, payload: result.rows[0].payload };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const verifiedUser = await verifyBearerUser(req);
  if (!verifiedUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { description, userPhone } = req.body || {};
    const bodyParentRequestId = asOptionalString(req.body?.parentRequestId, 120);
    const draftKey = asOptionalString(req.body?.draftKey, 120);
    const draft = bodyParentRequestId
      ? null
      : sanitizeParentRequestDraft(req.body?.parentRequest, verifiedUser);

    const pool = getDbPool();
    let targetParentRequestId = bodyParentRequestId || null;

    if (targetParentRequestId) {
      const existingRequest = await ensureOwnedParentRequest(targetParentRequestId, verifiedUser.id);
      if (!existingRequest) {
        return res.status(404).json({ error: 'Parent request not found' });
      }

      const existingStatus = String(existingRequest.payload?.status || '');
      if (existingStatus === 'approved') {
        return res.status(409).json({ error: 'Approved request cannot be charged again' });
      }
    } else if (draft) {
      const existingDraft = draftKey ? await findDraftRequestByKey(draftKey, verifiedUser.id) : null;
      if (existingDraft) {
        targetParentRequestId = existingDraft.id;
      } else {
        const now = Date.now();
        targetParentRequestId = crypto.randomUUID();
        const parentPayload = {
          ...draft,
          id: targetParentRequestId,
          type: 'parent',
          createdAt: now,
          updatedAt: now,
          changeLog: [
            {
              at: now,
              type: 'created',
              by: 'user',
              note: 'Заявка создана и ожидает оплаты',
            },
          ],
          ...(draftKey ? { paymentDraftKey: draftKey } : {}),
        } as ParentRequest;

        await pool.query(
          `INSERT INTO parents (id, user_id, payload) VALUES ($1, $2, $3::jsonb)`,
          [targetParentRequestId, verifiedUser.id, JSON.stringify(parentPayload)],
        );
      }
    } else {
      return res.status(400).json({ error: 'Missing parent request' });
    }

    const duplicatePayment = await pool.query(
      `SELECT id
         FROM payments
        WHERE parent_request_id = $1
          AND status IN ('pending', 'waiting_for_capture')
        ORDER BY created_at DESC
        LIMIT 1`,
      [targetParentRequestId],
    );

    if (duplicatePayment.rowCount > 0) {
      return res.status(409).json({
        error: 'Payment already in progress for this request',
        parent_request_id: targetParentRequestId,
      });
    }

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey) {
      console.error('YooKassa credentials missing');
      return res.status(500).json({ error: 'Payment gateway configuration error' });
    }

    const amount = MATCHING_FEE_RUB;

    const dbRes = await pool.query(
      `INSERT INTO payments (parent_request_id, amount, currency, status, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        targetParentRequestId,
        amount,
        'RUB',
        'pending',
        JSON.stringify({
          email: verifiedUser.email,
          phone: asOptionalString(userPhone, 40),
          description: asOptionalString(description, 200) || 'Оплата подбора няни Blizko',
          ownerUserId: verifiedUser.id,
        }),
      ],
    );

    const paymentRecordId = dbRes.rows[0].id as string;
    const authHeader = `Basic ${base64Encode(`${shopId}:${secretKey}`)}`;
    const idempotencyKey = targetParentRequestId;

    const appUrl = process.env.APP_URL || 'https://blizko.app';
    const returnUrl = `${appUrl}/success?paid=true&payment_id=${paymentRecordId}`;

    const payload: Record<string, unknown> = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      description: asOptionalString(description, 200) || 'Оплата подбора няни Blizko',
      metadata: {
        paymentRecordId,
        parentRequestId: targetParentRequestId,
      },
    };

    if (verifiedUser.email || userPhone) {
      payload.receipt = {
        customer: {
          email: verifiedUser.email || undefined,
          phone: asOptionalString(userPhone, 40),
        },
        items: [
          {
            description: asOptionalString(description, 200) || 'Оплата подбора няни Blizko',
            quantity: '1.00',
            amount: {
              value: amount.toFixed(2),
              currency: 'RUB',
            },
            vat_code: 1,
          },
        ],
      };
    }

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Idempotence-Key': idempotencyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('YooKassa error:', data);
      await pool.query(`UPDATE payments SET status = 'canceled' WHERE id = $1`, [paymentRecordId]);
      return res.status(response.status).json({
        error: 'Payment gateway rejected the request',
        parent_request_id: targetParentRequestId,
      });
    }

    if (data.id) {
      await pool.query(
        `UPDATE payments SET yk_payment_id = $1 WHERE id = $2`,
        [data.id, paymentRecordId],
      );
    }

    return res.status(200).json({
      id: paymentRecordId,
      yk_payment_id: data.id,
      confirmation_url: data.confirmation?.confirmation_url,
      status: data.status,
      parent_request_id: targetParentRequestId,
    });
  } catch (error: any) {
    if (error?.message === 'FORBIDDEN_PARENT_REQUEST') {
      return res.status(403).json({ error: 'Parent request does not belong to this user' });
    }

    if (String(error?.message || '').startsWith('Missing field:')) {
      return res.status(400).json({ error: error.message });
    }

    console.error('Payment creation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
