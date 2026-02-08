/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

type NotifyPayload = {
  event?: string;
  to?: string;
  subject?: string;
  text?: string;
  requestId?: string;
  status?: string;
};

async function sendResendEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'Blizko <no-reply@blizko.app>';
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data?.message || data?.error || `Resend error ${r.status}`);
  }

  return data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = (req.body || {}) as NotifyPayload;
  const event = String(body.event || 'unknown');
  const subject = String(body.subject || 'Blizko уведомление');
  const text = String(body.text || '');

  try {
    let to = String(body.to || '').trim();

    if (!to && event.startsWith('admin.')) {
      to = String(process.env.ADMIN_EMAIL || '').trim();
    }

    if (!to) {
      return res.status(200).json({ ok: false, skipped: true, reason: 'no-recipient' });
    }

    const result = await sendResendEmail(to, subject, text);
    return res.status(200).json({ ok: true, to, id: result?.id || null });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
