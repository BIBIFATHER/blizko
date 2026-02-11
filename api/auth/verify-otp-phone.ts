/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServiceSupabase } from './_supabase';
import { setCors } from '../_cors';

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
  setCors(req.headers.origin, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();

  if (!phone || !/^\d{4,8}$/.test(code)) {
    return json(res, 400, { ok: false, error: 'Некорректные данные' });
  }

  const supabase = getServiceSupabase();
  if (!supabase) return json(res, 500, { ok: false, error: 'OTP storage is not configured' });

  const { data: entry, error } = await supabase
    .from('phone_otps')
    .select('phone,code,expires_at,attempts')
    .eq('phone', phone)
    .maybeSingle();

  if (error) return json(res, 500, { ok: false, error: 'Failed to load OTP state' });
  if (!entry) return json(res, 400, { ok: false, error: 'Код не найден. Запросите новый.' });

  const expiresAt = new Date(entry.expires_at).getTime();
  if (Date.now() > expiresAt) {
    await supabase.from('phone_otps').delete().eq('phone', phone);
    return json(res, 400, { ok: false, error: 'Срок действия кода истёк. Запросите новый.' });
  }

  const nextAttempts = Number(entry.attempts || 0) + 1;
  if (nextAttempts > 5) {
    await supabase.from('phone_otps').delete().eq('phone', phone);
    return json(res, 429, { ok: false, error: 'Слишком много попыток. Запросите новый код.' });
  }

  if (entry.code !== code) {
    await supabase.from('phone_otps').update({ attempts: nextAttempts }).eq('phone', phone);
    return json(res, 400, { ok: false, error: 'Неверный код' });
  }

  await supabase.from('phone_otps').delete().eq('phone', phone);
  return json(res, 200, { ok: true, phone });
}
