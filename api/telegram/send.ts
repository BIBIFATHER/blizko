/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Server-side Telegram send endpoint.
 * Keeps BOT_TOKEN on the server (not exposed to client).
 * 
 * POST /api/telegram/send
 * Body: { chat_id, text, parse_mode?, reply_markup? }
 * Header: x-notify-token (must match NOTIFY_TOKEN env)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://blizko.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-notify-token');
    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Auth check
    const notifyToken = process.env.NOTIFY_TOKEN;
    if (notifyToken) {
        const incoming = String(req.headers['x-notify-token'] || '').trim();
        if (!incoming || incoming !== notifyToken) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
    }

    const { chat_id, text, parse_mode, reply_markup } = req.body || {};
    if (!chat_id || !text) {
        return res.status(400).json({ error: 'chat_id and text are required' });
    }

    try {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id,
                text,
                parse_mode: parse_mode || 'HTML',
                reply_markup,
            }),
        });

        const data = await tgRes.json();

        if (!tgRes.ok) {
            return res.status(tgRes.status).json({ error: data?.description || 'Telegram API error' });
        }

        return res.status(200).json({ ok: true, message_id: data?.result?.message_id });
    } catch (e: any) {
        return res.status(500).json({ error: String(e?.message || e) });
    }
}
