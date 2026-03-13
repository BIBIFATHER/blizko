/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServiceSupabase } from './_supabase.js';
import { setCors } from '../_cors.js';
import { rateLimit } from '../_rate-limit.js';
import { auditLog, maskPhone } from '../_audit.js';

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

  // Rate limit: 10 attempts/min per IP
  const rl = rateLimit(req, { max: 10, prefix: 'verify-otp' });
  if (!rl.ok) {
    auditLog(req, 'rate_limited', { endpoint: 'verify-otp' });
    return json(res, 429, { ok: false, error: 'Слишком много попыток. Подождите.' });
  }

  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();

  if (!phone || !/^\d{4,8}$/.test(code)) {
    return json(res, 400, { ok: false, error: 'Некорректные данные' });
  }

  const supabase = getServiceSupabase();
  if (!supabase) return json(res, 503, { ok: false, error: 'Auth service unavailable' });

  // 1. Verify OTP code
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

  // OTP verified! Clean up
  await supabase.from('phone_otps').delete().eq('phone', phone);
  auditLog(req, 'otp_verified', { phone: maskPhone(phone) });

  // 2. Find or create user in Supabase Auth (unified identity)
  try {
    // Try to find existing user by phone
    const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1 });
    
    // Search by phone in a more reliable way
    const { data: userByPhone } = await supabase
      .from('auth_phone_lookup')
      .select('user_id')
      .eq('phone', phone)
      .maybeSingle()
      .then(r => r)
      .catch(() => ({ data: null }));

    let userId: string;

    if (userByPhone?.user_id) {
      // Existing user
      userId = userByPhone.user_id;
    } else {
      // Create new user with phone
      const tempEmail = `phone_${phone.replace(/\+/g, '')}@blizko.local`;
      const tempPassword = `${phone}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: tempEmail,
        password: tempPassword,
        phone: phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone, auth_method: 'phone_otp' },
      });

      if (createError) {
        // User might already exist with this email pattern — try to find
        const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const existing = allUsers?.find((u: any) => u.phone === phone || u.email === tempEmail);
        
        if (existing) {
          userId = existing.id;
        } else {
          console.error('Failed to create Supabase user:', createError);
          // Fallback: return success without session (backward compatible)
          return json(res, 200, { ok: true, phone, fallback: true });
        }
      } else {
        userId = newUser.user.id;
      }
    }

    // 3. Generate session tokens via Admin API
    //    This creates a valid JWT that the client can use with Supabase
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    // Use the Gotrue admin endpoint to generate a session
    const tokenRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'magiclink',
        email: `phone_${phone.replace(/\+/g, '')}@blizko.local`,
      }),
    });

    // If we can't generate a magic link, still return success (backward compatible)
    if (!tokenRes.ok) {
      return json(res, 200, { ok: true, phone, userId, fallback: true });
    }

    const linkData: any = await tokenRes.json().catch(() => ({}));
    
    // Extract the token from the magic link URL
    const actionLink = linkData?.action_link || '';
    const tokenMatch = actionLink.match(/token=([^&]+)/);
    const otpToken = tokenMatch?.[1];

    if (!otpToken) {
      return json(res, 200, { ok: true, phone, userId, fallback: true });
    }

    // Return the OTP token that client can use to verify and get a session
    return json(res, 200, {
      ok: true,
      phone,
      userId,
      // Client should call supabase.auth.verifyOtp({ token_hash: otpToken, type: 'email' })
      supabaseToken: otpToken,
      tokenType: 'magiclink',
    });
  } catch (e: any) {
    // Fallback: return success without session (backward compatible)
    console.error('Unified auth error:', e?.message || e);
    return json(res, 200, { ok: true, phone, fallback: true });
  }
}
