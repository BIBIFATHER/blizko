/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

type OtpEntry = { code: string; expiresAt: number; attempts: number; sentAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __blizkoPhoneOtp: Map<string, OtpEntry> | undefined;
  // eslint-disable-next-line no-var
  var __blizkoPhoneOtpRate: Map<string, number[]> | undefined;
}

const otpStore = global.__blizkoPhoneOtp || (global.__blizkoPhoneOtp = new Map<string, OtpEntry>());
const rateStore = global.__blizkoPhoneOtpRate || (global.__blizkoPhoneOtpRate = new Map<string, number[]>());

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

function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const arr = rateStore.get(phone) || [];
  const recent = arr.filter((t) => now - t < 60 * 60 * 1000); // 1h
  if (recent.length >= 5) return false;
  recent.push(now);
  rateStore.set(phone, recent);
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  const apiKey = process.env.SMSAERO_API_KEY;
  const email = process.env.SMSAERO_EMAIL;
  const sign = process.env.SMSAERO_SIGN || 'SMS Aero';

  if (!apiKey || !email) {
    return json(res, 500, { ok: false, error: 'SMSAero is not configured (SMSAERO_EMAIL / SMSAERO_API_KEY)' });
  }

  const phone = normalizePhone(req.body?.phone);
  if (!isValidE164(phone)) return json(res, 400, { ok: false, error: 'Некорректный номер телефона' });

  const existing = otpStore.get(phone);
  if (existing && Date.now() - existing.sentAt < 60 * 1000) {
    return json(res, 429, { ok: false, error: 'Повторная отправка возможна через 60 секунд' });
  }
  if (!checkRateLimit(phone)) {
    return json(res, 429, { ok: false, error: 'Слишком много попыток. Попробуйте позже.' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const text = `Код Blizko: ${code}. Никому не сообщайте код.`;

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

    otpStore.set(phone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      sentAt: Date.now(),
    });

    return json(res, 200, { ok: true, expiresInSec: 300 });
  } catch (e: any) {
    return json(res, 500, { ok: false, error: String(e?.message || e) });
  }
}
