/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { setCors } from './_cors';

function envWithLocalFallback(key: string): string | undefined {
  const direct = process.env[key];
  if (direct) return direct;

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const raw = fs.readFileSync(envPath, 'utf8');
    const m = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m?.[1]?.trim();
  } catch {
    return undefined;
  }
}

async function sendResendEmail(to: string, subject: string, text: string) {
  const apiKey = envWithLocalFallback('RESEND_API_KEY');
  const from = envWithLocalFallback('RESEND_FROM_EMAIL') || 'Blizko <no-reply@blizko.app>';
  if (!apiKey) throw new Error('RESEND_API_KEY is missing');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || data?.error || `Resend error ${r.status}`);
  return data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method || '')) return res.status(405).json({ error: 'Method not allowed' });

  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const requiredToken = envWithLocalFallback('NOTIFY_TOKEN');
  if (requiredToken) {
    const incoming = String(req.headers['x-notify-token'] || '').trim();
    if (!incoming || incoming !== requiredToken) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }

  const to = String(req.query.to || req.body?.to || envWithLocalFallback('ADMIN_EMAIL') || '').trim();
  if (!to) return res.status(400).json({ ok: false, error: 'Recipient email is required (?to=...) or ADMIN_EMAIL' });

  if (!envWithLocalFallback('RESEND_API_KEY')) {
    return res.status(200).json({ ok: false, skipped: true, error: 'RESEND_API_KEY is missing in environment' });
  }

  try {
    const result = await sendResendEmail(
      to,
      'Blizko: test notification',
      'Тестовое письмо Blizko: канал уведомлений работает.'
    );

    return res.status(200).json({ ok: true, to, id: result?.id || null });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
