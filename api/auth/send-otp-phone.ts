/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServiceSupabase } from './_supabase.js';
import { setCors } from '../_cors.js';

const json = (res: VercelResponse, status: number, payload: any) => res.status(status).json(payload);

function normalizePhone(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return `+${trimmed.replace(/[^\d]/g, '')}`;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 10) return `+7${digits}`;
  return `+${digits}`;
}

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

type OtpRow = {
  phone: string;
  code: string;
  expires_at: string;
  attempts: number;
  sent_at: string;
  window_start: string;
  send_count: number;
};

const HOUR_MS = 60 * 60 * 1000;

function canSend(now: number, row?: OtpRow | null): { ok: boolean; windowStart: number; sendCount: number } {
  if (!row) return { ok: true, windowStart: now, sendCount: 0 };
  const windowStart = row.window_start ? new Date(row.window_start).getTime() : now;
  const sendCount = Number(row.send_count || 0);
  if (now - windowStart > HOUR_MS) return { ok: true, windowStart: now, sendCount: 0 };
  if (sendCount >= 5) return { ok: false, windowStart, sendCount };
  return { ok: true, windowStart, sendCount };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  const apiKey = process.env.SMSAERO_API_KEY;
  const email = process.env.SMSAERO_EMAIL;
  const sign = process.env.SMSAERO_SIGN || 'SMS Aero';

  const isProd = process.env.NODE_ENV === 'production';
  const smsConfigured = Boolean(apiKey && email);

  const phone = normalizePhone(req.body?.phone);
  if (!isValidE164(phone)) return json(res, 400, { ok: false, error: 'Некорректный номер телефона' });

  const supabase = getServiceSupabase();
  if (!supabase) return json(res, 503, { ok: false, error: 'OTP storage is not configured (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)' });

  const { data: existing, error: existingError } = await supabase
    .from('phone_otps')
    .select('phone,code,expires_at,attempts,sent_at,window_start,send_count')
    .eq('phone', phone)
    .maybeSingle();

  if (existingError) {
    return json(res, 500, { ok: false, error: 'Failed to load OTP state' });
  }

  if (existing?.sent_at && Date.now() - new Date(existing.sent_at).getTime() < 60 * 1000) {
    return json(res, 429, { ok: false, error: 'Повторная отправка возможна через 60 секунд' });
  }

  const rate = canSend(Date.now(), existing as OtpRow | null);
  if (!rate.ok) {
    return json(res, 429, { ok: false, error: 'Слишком много попыток. Попробуйте позже.' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const text = `Код Blizko: ${code}. Никому не сообщайте код.`;

  if (!smsConfigured) {
    if (isProd) {
      return json(res, 500, { ok: false, error: 'SMS-сервис временно не настроен' });
    }

    const now = new Date();
    const { error } = await supabase.from('phone_otps').upsert(
      {
        phone,
        code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        attempts: 0,
        sent_at: now.toISOString(),
        window_start: new Date(rate.windowStart).toISOString(),
        send_count: rate.sendCount + 1,
      },
      { onConflict: 'phone' }
    );

    if (error) return json(res, 500, { ok: false, error: 'Failed to store OTP' });

    return json(res, 200, { ok: true, expiresInSec: 300, demoCode: code, demo: true });
  }

  try {
    const smsRes = await fetch('https://gate.smsaero.ru/v2/sms/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${email}:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: phone, text, sign }),
    });

    const data = await smsRes.json().catch(() => ({}));
    if (!smsRes.ok || data?.success === false) {
      return json(res, 502, {
        ok: false,
        error: data?.message || data?.errors?.[0]?.message || 'Не удалось отправить SMS-код',
      });
    }

    const now = new Date();
    const { error } = await supabase.from('phone_otps').upsert(
      {
        phone,
        code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        attempts: 0,
        sent_at: now.toISOString(),
        window_start: new Date(rate.windowStart).toISOString(),
        send_count: rate.sendCount + 1,
      },
      { onConflict: 'phone' }
    );

    if (error) return json(res, 500, { ok: false, error: 'Failed to store OTP' });

    return json(res, 200, { ok: true, expiresInSec: 300 });
  } catch (e: any) {
    return json(res, 500, { ok: false, error: String(e?.message || e) });
  }
}
