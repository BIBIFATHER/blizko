/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_cors.js';
import { rateLimit } from './_rate-limit.js';
import { envWithLocalFallback, verifyBearerUser } from './_auth.js';

type NotifyPayload = {
  channel?: 'email' | 'telegram';
  event?: string;
  to?: string;
  subject?: string;
  text?: string;
  chat_id?: string;
  message?: string;
  parse_mode?: 'HTML' | 'Markdown';
  reply_markup?: Record<string, unknown>;
  requestId?: string;
  status?: string;
};

async function sendResendEmail(to: string, subject: string, text: string) {
  const apiKey = envWithLocalFallback('RESEND_API_KEY');
  const from = envWithLocalFallback('RESEND_FROM_EMAIL') || 'Blizko <no-reply@blizko.app>';
  const replyTo = envWithLocalFallback('RESEND_REPLY_TO') || 'hello@blizko.app';
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
      reply_to: replyTo,
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

async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parse_mode?: 'HTML' | 'Markdown'; reply_markup?: Record<string, unknown> }
) {
  const botToken = envWithLocalFallback('TELEGRAM_BOT_TOKEN');
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || 'HTML',
      reply_markup: options?.reply_markup,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.description || 'Telegram API error');
  }

  return data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rl = rateLimit(req, { max: 20, prefix: 'notify' });
  if (!rl.ok) {
    return res.status(429).json({ ok: false, error: 'Too many requests' });
  }

  const requiredToken = process.env.NOTIFY_TOKEN;
  const incoming = String(req.headers['x-notify-token'] || '').trim();
  const hasInternalToken = Boolean(requiredToken && incoming && incoming === requiredToken);
  const verifiedUser = hasInternalToken ? null : await verifyBearerUser(req);

  const body = (req.body || {}) as NotifyPayload;
  const channel = String(body.channel || '').trim().toLowerCase();
  const event = String(body.event || 'unknown');
  const subject = String(body.subject || 'Blizko уведомление');
  const text = String(body.text || '');

  if (!hasInternalToken) {
    // Client-initiated notifications are limited to authenticated in-app users
    // and may only target internal admin inboxes.
    if (!verifiedUser || !event.startsWith('admin.')) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }

  try {
    if (channel === 'telegram') {
      const chatId = String(body.chat_id || envWithLocalFallback('TELEGRAM_ADMIN_CHAT_ID') || '').trim();
      const message = String(body.text || body.message || '').trim();
      if (!chatId || !message) {
        return res.status(400).json({ ok: false, error: 'chat_id and message are required' });
      }

      if (!hasInternalToken) {
        const adminEmail = String(envWithLocalFallback('ADMIN_EMAIL') || '').trim().toLowerCase();
        if (!verifiedUser?.email || verifiedUser.email !== adminEmail) {
          return res.status(403).json({ ok: false, error: 'Admin access required' });
        }
      }

      const result = await sendTelegramMessage(chatId, message, {
        parse_mode: body.parse_mode,
        reply_markup: body.reply_markup,
      });
      return res.status(200).json({ ok: true, message_id: result?.result?.message_id || null });
    }

    let to = hasInternalToken ? String(body.to || '').trim() : '';

    if (!to && event.startsWith('admin.')) {
      to = String(envWithLocalFallback('ADMIN_EMAIL') || '').trim();
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
