/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

function normalizePhone(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('+')) {
    return `+${trimmed.replace(/[^\d]/g, '')}`;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // RU local 8XXXXXXXXXX -> +7XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 10) return `+7${digits}`;
  return `+${digits}`;
}

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    return res.status(500).json({ error: 'Twilio Verify is not configured on server' });
  }

  const phone = normalizePhone(req.body?.phone);
  if (!isValidE164(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`;
    const body = new URLSearchParams({ To: phone, Channel: 'sms' });

    const twilioRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await twilioRes.json().catch(() => ({}));

    if (!twilioRes.ok) {
      return res.status(twilioRes.status).json({
        error: data?.message || data?.detail || 'Failed to send OTP',
      });
    }

    return res.status(200).json({
      ok: true,
      status: data?.status || 'pending',
      to: data?.to || phone,
    });
  } catch (e: any) {
    return res.status(500).json({ error: `Twilio request failed: ${String(e?.message ?? e)}` });
  }
}
