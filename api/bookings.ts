import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { setCors } from './_cors.js';
import { rateLimit } from './_rate-limit.js';
import { verifyBearerAdmin } from './_auth.js';
import { getDbPool } from './_db.js';
import { logError } from './_logScrub.js';

const json = (res: VercelResponse, status: number, payload: unknown) => res.status(status).json(payload);

const ACTIVE = ['pending', 'confirmed', 'active'];
const ELIGIBLE_PARENT_STATUS = new Set(['new', 'in_review']); // NULL тоже eligible (C2)

// Валидация входа (C8). Строгие форматы ДО любого парсинга/транзакции.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // строго YYYY-MM-DD
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AMOUNT_RE = /^\d{1,9}(\.\d{1,2})?$/; // допустимый ввод (amount пока TEXT; numeric — План E)
function isValidCalendarDate(d: string): boolean {
  if (!DATE_RE.test(d)) return false;
  const dt = new Date(d + 'T00:00:00.000Z');
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === d; // отсекает 2026-02-31
}
// Канон amount → фикс. decimal NNNN.NN (§4): '1'/'1.0'/'1.00' → одинаковый '1.00'.
function canonicalizeAmount(raw: string): string {
  const [int, frac = ''] = raw.split('.');
  return `${int}.${(frac + '00').slice(0, 2)}`;
}

// Canonical fingerprint (§4): sha256:v1 над нормализованными полями интента + amount.
// date уже провалидирован (YYYY-MM-DD); amount уже канонизирован (NNNN.NN) или absent → без throw.
function computeFingerprint(input: {
  request_id: string;
  nanny_entity_id: string;
  date: string;
  amount?: string;
}): string {
  const amount = input.amount == null ? '\0' : input.amount;
  const canon = [input.request_id, input.nanny_entity_id, input.date, amount].join('\x1f');
  return 'sha256:v1:' + createHash('sha256').update(canon, 'utf8').digest('hex');
}

async function createBooking(req: VercelRequest, res: VercelResponse) {
  const admin = await verifyBearerAdmin(req);
  if (!admin) return json(res, 401, { error: 'Unauthorized' });
  const rl = rateLimit(req, { prefix: 'bookings-create:' + admin.id, max: 10, windowMs: 60_000 });
  if (!rl.ok) return json(res, 429, { error: 'Too many requests' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const s = (k: string) => (typeof body[k] === 'string' ? (body[k] as string).trim() : '');
  const request_id = s('request_id');
  const nanny_entity_id = s('nanny_entity_id');
  const idempotency_key = s('idempotency_key');
  const date = s('date');
  // C8: строгая валидация форматов ДО транзакции (иначе new Date мог бы бросить).
  if (!request_id || !nanny_entity_id || !idempotency_key || !date) {
    return json(res, 400, { error: 'request_id, nanny_entity_id, idempotency_key, date required' });
  }
  if (!UUID_RE.test(idempotency_key)) return json(res, 400, { error: 'idempotency_key must be a UUID' });
  if (!isValidCalendarDate(date)) return json(res, 400, { error: 'date must be a valid YYYY-MM-DD' });
  if (request_id.length > 128 || nanny_entity_id.length > 128) return json(res, 400, { error: 'id too long' });
  // amount: present-but-not-string → 400 (не молча undefined); string → validate → canon NNNN.NN.
  let amount: string | undefined;
  if (body.amount != null) {
    if (typeof body.amount !== 'string' || !AMOUNT_RE.test(body.amount.trim())) {
      return json(res, 400, { error: 'amount must be a decimal string' });
    }
    amount = canonicalizeAmount(body.amount.trim()); // единый wire-канон для INSERT и fingerprint
  }

  const fingerprint = computeFingerprint({ request_id, nanny_entity_id, date, amount });
  const client = await getDbPool().connect();
  try {
    await client.query('BEGIN');
    // 1. IDEMPOTENCY-FIRST: проверить ключ ДО всех mutable-guards, чтобы replay был
    //    guard-независим (статус заявки/аккаунт мог измениться).
    const existing = await client.query('SELECT * FROM bookings WHERE idempotency_key = $1', [idempotency_key]);
    if (existing.rowCount && existing.rowCount > 0) {
      const row = existing.rows[0];
      await client.query('ROLLBACK'); // read-only ветка
      if (row.idempotency_fingerprint === fingerprint) return json(res, 200, { booking: row });
      return json(res, 409, { error: 'idempotency key reused with different payload' });
    }
    // 2. lock+load parent(+status) и nanny (сериализует create пары под FOR UPDATE)
    const p = await client.query(
      `SELECT user_id, payload->>'status' AS status FROM parents WHERE id = $1 FOR UPDATE`,
      [request_id],
    );
    const n = await client.query('SELECT user_id FROM nannies WHERE id = $1 FOR UPDATE', [nanny_entity_id]);
    if (p.rowCount === 0 || n.rowCount === 0) {
      await client.query('ROLLBACK');
      return json(res, 404, { error: 'request or nanny not found' });
    }
    const parent_id = p.rows[0].user_id as string | null;
    const nanny_id = n.rows[0].user_id as string | null;
    const parentStatus = p.rows[0].status as string | null;
    // 3. auth-связь
    if (!parent_id || !nanny_id) {
      await client.query('ROLLBACK');
      return json(res, 422, { error: 'both parties must have auth accounts' });
    }
    // 3.5. IDEMPOTENCY RE-CHECK под локом (Codex round9): два конкурентных запроса с
    //     одним ключом оба промахнулись на шаге 1 (до лока); после сериализации на
    //     parents/nannies-локе победитель уже вставил строку — проигравший обязан вернуть
    //     200 replay, НЕ упасть в pair-cardinality (409). Ключ теперь виден под локом.
    const again = await client.query('SELECT * FROM bookings WHERE idempotency_key = $1', [idempotency_key]);
    if (again.rowCount && again.rowCount > 0) {
      const row = again.rows[0];
      await client.query('ROLLBACK');
      if (row.idempotency_fingerprint === fingerprint) return json(res, 200, { booking: row });
      return json(res, 409, { error: 'idempotency key reused with different payload' });
    }
    // 4. eligibility (C2): NULL или new/in_review
    if (parentStatus != null && !ELIGIBLE_PARENT_STATUS.has(parentStatus)) {
      await client.query('ROLLBACK');
      return json(res, 409, { error: 'request is not eligible for booking' });
    }
    // 5. deletion-guard (C4): любая строка на любую сторону (в т.ч. state='deleted')
    const del = await client.query(`SELECT 1 FROM account_deletions WHERE user_id = ANY($1::uuid[]) LIMIT 1`, [
      [parent_id, nanny_id],
    ]);
    if (del.rowCount && del.rowCount > 0) {
      await client.query('ROLLBACK');
      return json(res, 409, { error: 'a party account is being deleted' });
    }
    // 6. app-level cardinality (pair index — План E)
    const pair = await client.query(
      `SELECT id FROM bookings WHERE parent_id = $1 AND nanny_id = $2 AND status = ANY($3) LIMIT 1`,
      [parent_id, nanny_id, ACTIVE],
    );
    if (pair.rowCount && pair.rowCount > 0) {
      await client.query('ROLLBACK');
      return json(res, 409, { error: 'active booking for this pair already exists' });
    }
    // 7. insert; гонка на idempotency_key → reread ТЕМ ЖЕ client после ROLLBACK
    try {
      const ins = await client.query(
        `INSERT INTO bookings (parent_id, nanny_id, request_id, nanny_profile_id, date, amount,
                               status, idempotency_key, idempotency_fingerprint)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8) RETURNING *`,
        [parent_id, nanny_id, request_id, nanny_entity_id, date, amount ?? null, idempotency_key, fingerprint],
      );
      await client.query('COMMIT');
      return json(res, 201, { booking: ins.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      const err = e as { code?: string; constraint?: string };
      if (err?.code === '23505' && err?.constraint === 'bookings_idempotency_key_key') {
        const ex = await client.query('SELECT * FROM bookings WHERE idempotency_key = $1', [idempotency_key]);
        if (ex.rowCount && ex.rows[0].idempotency_fingerprint === fingerprint) {
          return json(res, 200, { booking: ex.rows[0] });
        }
        return json(res, 409, { error: 'idempotency key reused with different payload' });
      }
      throw e;
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    logError('[bookings] create failed:', e);
    return json(res, 500, { error: 'Internal error' });
  } finally {
    client.release();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  // C9 default-closed gate: маршрут неактивен, пока env не включён явно.
  if (process.env.BOOKINGS_ENDPOINT_ENABLED !== 'true') return json(res, 404, { error: 'Not found' });
  // Первый барьер — по IP (до auth). Actor-scoped лимит — внутри операций (C5).
  const rl = rateLimit(req, { max: 60, windowMs: 60_000, prefix: 'bookings-ip' });
  if (!rl.ok) return json(res, 429, { error: 'Too many requests' });

  const op = String((req.query as Record<string, unknown>)?.op || '');
  if (req.method === 'POST' && op === 'create') return createBooking(req, res);
  // op=status (Task 3), GET (Task 4) добавляются в свои задачи.
  return json(res, 405, { error: 'Method not allowed' });
}
