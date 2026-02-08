/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

type OtpEntry = { code: string; expiresAt: number; attempts: number; sentAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __blizkoPhoneOtp: Map<string, OtpEntry> | undefined;
}

const otpStore = global.__blizkoPhoneOtp || (global.__blizkoPhoneOtp = new Map<string, OtpEntry>());
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();

  if (!phone || !/^\d{4,8}$/.test(code)) {
    return json(res, 400, { ok: false, error: 'Некорректные данные' });
  }

  const entry = otpStore.get(phone);
  if (!entry) return json(res, 400, { ok: false, error: 'Код не найден. Запросите новый.' });
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return json(res, 400, { ok: false, error: 'Срок действия кода истёк. Запросите новый.' });
  }

  entry.attempts += 1;
  if (entry.attempts > 5) {
    otpStore.delete(phone);
    return json(res, 429, { ok: false, error: 'Слишком много попыток. Запросите новый код.' });
  }

  if (entry.code !== code) {
    otpStore.set(phone, entry);
    return json(res, 400, { ok: false, error: 'Неверный код' });
  }

  otpStore.delete(phone);
  return json(res, 200, { ok: true, phone });
}
