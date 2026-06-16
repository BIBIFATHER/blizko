/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_cors.js';
import { rateLimit } from './_rate-limit.js';
import { getGeminiApiKey, getGeminiModels, normalizeGeminiTemperature } from './_gemini.js';
import { identityAdmissionClosed } from './_synthetic.js';

const REQUEST_TIMEOUT_MS = 25000;

// ============================================
// GOLDEN RULES — The AI Concierge System Prompt
// ============================================
const SYSTEM_PROMPT = `Ты — Команда Blizko. Ты помогаешь родителям, которые ищут няню для своего ребёнка.

## Твоя личность:
- Ты заботливый эксперт, как отзывчивый помощник в премиальном сервисе.
- Ты НИКОГДА не говоришь "Уважаемый клиент", "Ваш тикет #123", "Ожидайте ответа оператора".
- Ты обращаешься по имени, если знаешь его.
- Ты используешь тёплый, но уверенный тон. Не заискиваешь, а помогаешь.

## Правила:
1. КОНТЕКСТ: Используй раздел "Контекст пользователя" и "История диалога" чтобы давать персонализированные ответы.
2. ЛАКОНИЧНОСТЬ: Отвечай кратко (2-4 предложения), не пиши эссе.
3. ЭМПАТИЯ: Если родитель расстроен — сначала признай его чувства, потом предлагай решение.
4. ЭСКАЛАЦИЯ: Если ты не можешь помочь или родитель просит человека — скажи "Антон уже в курсе и скоро подключится" и НЕ пытайся решить проблему дальше.
5. БЕЗОПАСНОСТЬ: Никогда не давай медицинских, юридических советов. Не обещай возвраты или компенсации.
6. ЯЗЫК: Отвечай на том языке, на котором пишет пользователь (обычно русский).

## Что ты можешь:
- Объяснить как работает подбор и верификация
- Помочь сформулировать или уточнить запрос
- Рассказать о безопасности и документах нянь
- Поддержать и помочь с выбором`;

// ============================================
// Supabase REST helpers (no SDK, just fetch)
// ============================================
function getSupabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}

// ============================================
// Auth validation — verify JWT and ticket ownership
// ============================================
async function verifyAuth(
  req: VercelRequest,
): Promise<{ userId: string; email: string | null } | null> {
  const base = getSupabaseUrl();
  const authHeader = req.headers.authorization;
  if (!base || !authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  try {
    const resp = await fetch(`${base}/auth/v1/user`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    return user?.id
      ? { userId: user.id, email: user?.email ? String(user.email).toLowerCase() : null }
      : null;
  } catch {
    return null;
  }
}

async function verifyTicketOwnership(ticketId: string, userId: string): Promise<boolean> {
  const base = getSupabaseUrl();
  if (!base || !ticketId || ticketId === 'test') return true; // Skip for test tickets

  try {
    const resp = await fetch(
      `${base}/rest/v1/support_tickets?id=eq.${ticketId}&family_id=eq.${userId}&select=id`,
      { headers: getSupabaseHeaders() },
    );
    if (!resp.ok) return false;
    const rows = await resp.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function updateTicketSentiment(ticketId: string, sentiment: number, escalate: boolean) {
  const base = getSupabaseUrl();
  if (!base || !ticketId || ticketId === 'test') return;

  const body: Record<string, unknown> = { sentiment_score: sentiment };
  if (escalate) body.status = 'human_escalated';

  await fetch(`${base}/rest/v1/support_tickets?id=eq.${ticketId}`, {
    method: 'PATCH',
    headers: getSupabaseHeaders(),
    body: JSON.stringify(body),
  }).catch(() => {
    /* ignore */
  });
}

async function insertAiMessage(ticketId: string, text: string) {
  const base = getSupabaseUrl();
  if (!base || !ticketId || ticketId === 'test') return;

  await fetch(`${base}/rest/v1/support_messages`, {
    method: 'POST',
    headers: getSupabaseHeaders(),
    body: JSON.stringify({ ticket_id: ticketId, sender_type: 'ai_concierge', text }),
  }).catch(() => {
    /* ignore */
  });
}

// ============================================
// Context enrichment — history + user profile
// ============================================

async function fetchRecentHistory(ticketId: string, currentMessage: string): Promise<string> {
  const base = getSupabaseUrl();
  if (!base || ticketId === 'test') return '';

  try {
    const resp = await fetch(
      `${base}/rest/v1/support_messages?ticket_id=eq.${ticketId}&order=created_at.desc&limit=11&select=sender_type,text`,
      { headers: getSupabaseHeaders() },
    );
    if (!resp.ok) return '';
    const rows: Array<{ sender_type: string; text: string }> = await resp.json().catch(() => []);

    // Exclude the current message if it was just inserted (newest first → index 0)
    const filtered = rows
      .filter((m, i) => !(i === 0 && m.sender_type === 'user' && m.text === currentMessage))
      .slice(0, 10)
      .reverse();

    if (!filtered.length) return '';

    const lines = filtered.map((m) => {
      const label = m.sender_type === 'user' ? 'Пользователь' : 'Команда Blizko';
      return `[${label}]: ${m.text}`;
    });
    return `\n\n## История диалога (последние сообщения):\n${lines.join('\n')}`;
  } catch {
    return '';
  }
}

async function fetchUserContext(userId: string): Promise<string> {
  const base = getSupabaseUrl();
  if (!base) return '';

  try {
    const resp = await fetch(
      `${base}/rest/v1/parents?user_id=eq.${userId}&select=payload&limit=1`,
      { headers: getSupabaseHeaders() },
    );
    if (!resp.ok) return '';
    const rows: Array<{ payload: Record<string, unknown> }> = await resp.json().catch(() => []);
    if (!rows.length) return '';

    const p = rows[0]?.payload || {};
    const parts: string[] = [];
    if (p.city) parts.push(`Город: ${p.city}`);
    if (p.childAge) parts.push(`Возраст ребёнка: ${p.childAge}`);
    if (p.schedule) parts.push(`Нужный график: ${p.schedule}`);
    if (p.budget) parts.push(`Бюджет: ${p.budget}`);

    return parts.length ? `\n\n## Контекст пользователя:\n${parts.join('\n')}` : '';
  } catch {
    return '';
  }
}

// ============================================
// Gemini API call
// ============================================
async function callGemini(
  apiKey: string,
  userMessage: string,
  options?: { json?: boolean; systemInstruction?: string; temperature?: number },
): Promise<string> {
  const models = getGeminiModels('support');

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const payload: Record<string, unknown> = {
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      };

      // Use systemInstruction for proper system prompt handling
      if (options?.systemInstruction) {
        payload.systemInstruction = { parts: [{ text: options.systemInstruction }] };
      }

      const temperature = normalizeGeminiTemperature(options?.temperature);
      if (options?.json || temperature !== undefined) {
        payload.generationConfig = {
          ...(options?.json ? { responseMimeType: 'application/json' } : {}),
          ...(temperature !== undefined ? { temperature } : {}),
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(
          `[Gemini] Model ${model} error ${response.status}:`,
          JSON.stringify(data?.error || data),
        );
        // Try next model on quota/rate limit or not found
        if (response.status === 404 || response.status === 429 || response.status === 400) continue;
        break;
      }

      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text)
          .filter(Boolean)
          .join('') || '';

      if (text) return text;

      // If empty but no error — log the finish reason and try next model
      const finishReason = data?.candidates?.[0]?.finishReason;
      console.warn(`[Gemini] Model ${model} returned empty. finishReason: ${finishReason}`);
      if (finishReason === 'SAFETY' || finishReason === 'RECITATION') continue;
      return text; // Return empty for other reasons
    } catch (e: any) {
      console.error(`[Gemini] Model ${model} exception:`, e?.message || e);
    } finally {
      clearTimeout(timeout);
    }
  }

  return '';
}

// ============================================
// Telegram human handoff (direct Bot API)
// ============================================
type SupportHistoryRow = {
  sender_type: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getToneLabel(sentiment: number) {
  if (sentiment < -0.5) return 'тревожный';
  if (sentiment < -0.15) return 'напряжённый';
  if (sentiment > 0.4) return 'спокойный';
  return 'нейтральный';
}

function getAdminSupportUrl(ticketId: string) {
  const base =
    process.env.VITE_PUBLIC_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    'https://www.blizko.app';
  const normalized = base.startsWith('http') ? base : `https://${base}`;
  return `${normalized.replace(/\/$/, '')}/admin/support?ticket=${encodeURIComponent(ticketId)}`;
}

async function fetchRecentHistoryRows(
  ticketId: string,
  currentMessage: string,
): Promise<SupportHistoryRow[]> {
  const base = getSupabaseUrl();
  if (!base || ticketId === 'test') return [];

  try {
    const resp = await fetch(
      `${base}/rest/v1/support_messages?ticket_id=eq.${ticketId}&order=created_at.desc&limit=6&select=sender_type,text`,
      { headers: getSupabaseHeaders() },
    );
    if (!resp.ok) return [];
    const rows: SupportHistoryRow[] = await resp.json().catch(() => []);
    return rows
      .filter((m, i) => !(i === 0 && m.sender_type === 'user' && m.text === currentMessage))
      .slice(0, 5)
      .reverse();
  } catch {
    return [];
  }
}

async function fetchUserTelegramContext(userId: string): Promise<string[]> {
  const base = getSupabaseUrl();
  if (!base || !userId) return [];

  try {
    const resp = await fetch(
      `${base}/rest/v1/parents?user_id=eq.${userId}&select=payload,created_at&order=created_at.desc&limit=1`,
      { headers: getSupabaseHeaders() },
    );
    if (!resp.ok) return [];
    const rows: Array<{ payload: Record<string, unknown> }> = await resp.json().catch(() => []);
    const p = rows[0]?.payload || {};
    const lines: string[] = [];
    if (p.city || p.district) {
      lines.push(`Локация: ${[p.city, p.district].filter(Boolean).join(', ')}`);
    }
    if (p.childAge) lines.push(`Ребёнок: ${p.childAge}`);
    if (p.schedule) lines.push(`График: ${p.schedule}`);
    if (p.budget) lines.push(`Бюджет: ${p.budget}`);
    if (p.requesterEmail) lines.push(`Контакт: ${p.requesterEmail}`);
    return lines;
  } catch {
    return [];
  }
}

async function sendTelegramHumanHandoff(params: {
  ticketId: string;
  userId: string;
  userMessage: string;
  sentiment: number;
  reason: string;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!botToken || !chatId) return;

  const [historyRows, contextLines] = await Promise.all([
    fetchRecentHistoryRows(params.ticketId, params.userMessage),
    fetchUserTelegramContext(params.userId),
  ]);

  const historyText = historyRows.length
    ? `\n\n<b>История:</b>\n${historyRows
        .map((m) => {
          const label = m.sender_type === 'user' ? 'Родитель' : 'Команда Blizko';
          return `• ${escapeHtml(label)}: ${escapeHtml(m.text).slice(0, 140)}`;
        })
        .join('\n')}`
    : '';

  const contextText = contextLines.length
    ? `\n\n<b>Контекст семьи:</b>\n${contextLines.map((line) => `• ${escapeHtml(line)}`).join('\n')}`
    : '';

  const text =
    `🟠 <b>Нужен ответ человека</b>\n\n` +
    `Причина: ${escapeHtml(params.reason)}\n` +
    `Тон сообщения: <b>${getToneLabel(params.sentiment)}</b>\n` +
    `Сообщение: <i>${escapeHtml(params.userMessage).slice(0, 240)}</i>` +
    contextText +
    historyText +
    `\n\nОткрой чат в админке: там будет история обращения и контекст семьи.`;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Открыть чат с семьёй', url: getAdminSupportUrl(params.ticketId) }],
        ],
      },
    }),
  }).catch((e) => console.error('[Telegram]', e));
}

// ============================================
// Main Handler
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 10 requests/min per IP
  const rl = rateLimit(req, { max: 10, prefix: 'ai-support' });
  if (!rl.ok) return res.status(429).json({ error: 'Слишком много запросов. Попробуйте позже.' });

  // Auth: verify JWT
  const auth = await verifyAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  // Synthetic-only: reject non-allow-listed identities (incl. restored sessions).
  if (identityAdmissionClosed(auth)) {
    return res.status(403).json({ error: 'Closed test contour: identity not admitted.' });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

  const body = req.body || {};
  const { message, ticketId } = body;
  const supportTicketId = typeof ticketId === 'string' ? ticketId.trim() : '';

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Verify ticket ownership — user can only interact with their own tickets
  if (supportTicketId && supportTicketId !== 'test') {
    const isOwner = await verifyTicketOwnership(supportTicketId, auth.userId);
    if (!isOwner)
      return res.status(403).json({ error: 'Forbidden: ticket does not belong to user' });
  }

  const userMessage = message.trim();

  try {
    let sentiment = 0.0;
    let needsHuman = false;
    let draftReply = '';

    const [historyBlock, userContext] = await Promise.all([
      fetchRecentHistory(supportTicketId, userMessage),
      fetchUserContext(auth.userId),
    ]);

    try {
      const raw = await callGemini(apiKey, userMessage, {
        json: true,
        temperature: 0.35,
        systemInstruction: `${SYSTEM_PROMPT}${userContext}${historyBlock}

Return ONLY valid JSON with this exact shape:
{
  "reply": string,
  "sentiment": number,
  "needs_human": boolean
}

Rules:
- sentiment must be between -1.0 and 1.0
- set needs_human=true if the user explicitly asks for a human, manager, operator, or if the request is beyond AI support
- keep reply warm, concise, and actionable
- if needs_human=true, reply should acknowledge escalation and avoid over-solving`,
      });
      const parsed = JSON.parse(raw);
      sentiment =
        typeof parsed.sentiment === 'number' ? Math.max(-1, Math.min(1, parsed.sentiment)) : 0.0;
      needsHuman = parsed.needs_human === true;
      draftReply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
    } catch {
      sentiment = 0.0;
    }

    // Keyword escalation check
    const lower = userMessage.toLowerCase();
    const escalationKeywords = [
      'человек',
      'оператор',
      'менеджер',
      'позови',
      'живой',
      'не помогает',
      'не понимаешь',
      'хочу поговорить',
    ];
    const keywordHandoff = escalationKeywords.some((kw) => lower.includes(kw));
    if (keywordHandoff) needsHuman = true;

    const shouldEscalate = needsHuman || sentiment < -0.5;
    await updateTicketSentiment(supportTicketId, sentiment, shouldEscalate);

    if (shouldEscalate) {
      if (supportTicketId && supportTicketId !== 'test') {
        await sendTelegramHumanHandoff({
          ticketId: supportTicketId,
          userId: auth.userId,
          userMessage,
          sentiment,
          reason: keywordHandoff
            ? 'родитель просит подключить человека или руководство'
            : 'сообщение выглядит тревожным',
        });
      }
      const reply =
        'Я понимаю, что ситуация непростая. Антон уже в курсе и скоро подключится лично. Вы в надёжных руках 💛';
      await insertAiMessage(supportTicketId, reply);
      return res.status(200).json({ reply, sentiment, escalated: true });
    }

    if (!draftReply) {
      return res.status(200).json({
        reply: 'Я здесь! Уточните, пожалуй, вопрос — и я постараюсь помочь.',
        sentiment,
        escalated: false,
      });
    }

    await insertAiMessage(supportTicketId, draftReply);
    return res.status(200).json({ reply: draftReply, sentiment, escalated: false });
  } catch (e: any) {
    console.error('[AI Support] Error:', e);
    return res.status(500).json({ error: `AI Support error: ${String(e?.message ?? e)}` });
  }
}
