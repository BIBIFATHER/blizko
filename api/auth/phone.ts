/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServiceSupabase } from './_supabase.js';
import { setCors } from '../_cors.js';
import { rateLimit } from '../_rate-limit.js';
import { auditLog, maskPhone } from '../_audit.js';

const json = (res: VercelResponse, status: number, payload: any) => res.status(status).json(payload);

// Test phone for YooKassa verification (env: TEST_OTP_PHONE=+79000000000)
const TEST_PHONE = process.env.TEST_OTP_PHONE || '+79000000000';
const TEST_CODE = '000000';
const isTestPhone = (phone: string) => phone === TEST_PHONE;

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

async function handleSend(req: VercelRequest, res: VercelResponse) {
  const rl = rateLimit(req, { max: 5, prefix: 'send-otp' });
  if (!rl.ok) {
    auditLog(req, 'rate_limited', { endpoint: 'send-otp' });
    return json(res, 429, { ok: false, error: 'Слишком много запросов. Подождите.' });
  }

  const apiKey = process.env.SMSAERO_API_KEY;
  const email = process.env.SMSAERO_EMAIL;
  const sign = process.env.SMSAERO_SIGN || 'SMS Aero';
  const isProd = process.env.NODE_ENV === 'production';
  const smsConfigured = Boolean(apiKey && email);

  const phone = normalizePhone(req.body?.phone);
  if (!isValidE164(phone)) return json(res, 400, { ok: false, error: 'Некорректный номер телефона' });

  // Test phone bypass — no SMS, fixed code
  if (isTestPhone(phone)) {
    const supabaseTest = getServiceSupabase();
    if (supabaseTest) {
      await supabaseTest.from('phone_otps').upsert(
        { phone, code: TEST_CODE, expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), attempts: 0, sent_at: new Date().toISOString(), window_start: new Date().toISOString(), send_count: 1 },
        { onConflict: 'phone' }
      );
    }
    return json(res, 200, { ok: true, expiresInSec: 1800 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) return json(res, 503, { ok: false, error: 'OTP storage is not configured (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)' });

  const { data: existing, error: existingError } = await supabase
    .from('phone_otps')
    .select('phone,code,expires_at,attempts,sent_at,window_start,send_count')
    .eq('phone', phone)
    .maybeSingle();

  if (existingError) return json(res, 500, { ok: false, error: 'Failed to load OTP state' });
  if (existing?.sent_at && Date.now() - new Date(existing.sent_at).getTime() < 60 * 1000) {
    return json(res, 429, { ok: false, error: 'Повторная отправка возможна через 60 секунд' });
  }

  const rate = canSend(Date.now(), existing as OtpRow | null);
  if (!rate.ok) return json(res, 429, { ok: false, error: 'Слишком много попыток. Попробуйте позже.' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const text = `Код Blizko: ${code}. Никому не сообщайте код.`;

  if (!smsConfigured) {
    if (isProd) return json(res, 500, { ok: false, error: 'SMS-сервис временно не настроен' });

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

async function handleVerify(req: VercelRequest, res: VercelResponse) {
  const rl = rateLimit(req, { max: 10, prefix: 'verify-otp' });
  if (!rl.ok) {
    auditLog(req, 'rate_limited', { endpoint: 'verify-otp' });
    return json(res, 429, { ok: false, error: 'Слишком много попыток. Подождите.' });
  }

  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();
  if (!phone || !/^\d{4,8}$/.test(code)) return json(res, 400, { ok: false, error: 'Некорректные данные' });

  const supabase = getServiceSupabase();
  if (!supabase) return json(res, 503, { ok: false, error: 'Auth service unavailable' });

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
    auditLog(req, 'otp_failed', { phone: maskPhone(phone), attempt: nextAttempts });
    return json(res, 400, { ok: false, error: 'Неверный код' });
  }

  await supabase.from('phone_otps').delete().eq('phone', phone);
  auditLog(req, 'otp_verified', { phone: maskPhone(phone) });

  try {
    const { data: userByPhone, error: lookupError } = await supabase
      .from('auth_phone_lookup')
      .select('user_id')
      .eq('phone', phone)
      .maybeSingle();

    if (lookupError) {
      console.warn('Phone lookup warning:', lookupError.message);
    }

    let userId: string;
    if (userByPhone?.user_id) {
      userId = userByPhone.user_id;
    } else {
      const tempEmail = `phone_${phone.replace(/\+/g, '')}@blizko.local`;
      const tempPassword = `${phone}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: tempEmail,
        password: tempPassword,
        phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone, auth_method: 'phone_otp' },
      });

      if (createError) {
        const { data: allUsersResponse } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const existing = allUsersResponse?.users?.find((u: any) => u.phone === phone || u.email === tempEmail);

        if (existing) {
          userId = existing.id;
        } else {
          console.error('Failed to create Supabase user:', createError);
          return json(res, 200, { ok: true, phone, fallback: true });
        }
      } else {
        userId = newUser.user.id;
      }
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const tokenRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'magiclink',
        email: `phone_${phone.replace(/\+/g, '')}@blizko.local`,
      }),
    });

    if (!tokenRes.ok) {
      return json(res, 200, { ok: true, phone, userId, fallback: true });
    }

    const linkData: any = await tokenRes.json().catch(() => ({}));
    const actionLink = linkData?.action_link || '';
    const tokenMatch = actionLink.match(/token=([^&]+)/);
    const otpToken = tokenMatch?.[1];

    if (!otpToken) {
      return json(res, 200, { ok: true, phone, userId, fallback: true });
    }

    return json(res, 200, {
      ok: true,
      phone,
      userId,
      supabaseToken: otpToken,
      tokenType: 'magiclink',
    });
  } catch (e: any) {
    console.error('Unified auth error:', e?.message || e);
    return json(res, 200, { ok: true, phone, fallback: true });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  const action = String(req.body?.action || (req.query as any)?.action || '').trim().toLowerCase();
  if (action === 'send') return handleSend(req, res);
  if (action === 'verify') return handleVerify(req, res);

  return json(res, 400, { ok: false, error: 'Unknown action' });
}
