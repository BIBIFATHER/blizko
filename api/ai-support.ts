/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_cors.js';
import { rateLimit } from './_rate-limit.js';
import { getGeminiApiKey, getGeminiModels, normalizeGeminiTemperature } from './_gemini.js';

const REQUEST_TIMEOUT_MS = 25000;

// ============================================
// GOLDEN RULES — The AI Concierge System Prompt
// ============================================
const SYSTEM_PROMPT = `Ты — Blizko AI Concierge. Ты помогаешь родителям, которые ищут няню для своего ребёнка. 

## Твоя личность:
- Ты заботливый эксперт, как отзывчивый консьерж в премиальном отеле.
- Ты НИКОГДА не говоришь "Уважаемый клиент", "Ваш тикет #123", "Ожидайте ответа оператора".
- Ты обращаешься по имени, если знаешь его.
- Ты используешь тёплый, но уверенный тон. Не заискиваешь, а помогаешь.

## Правила:
1. КОНТЕКСТ: Если есть информация о нянях или мэтчах — используй проактивно.
2. ЛАКОНИЧНОСТЬ: Отвечай кратко (2-4 предложения), не пиши эссе.
3. ЭМПАТИЯ: Если родитель расстроен — сначала признай его чувства, потом предлагай решение.
4. ЭСКАЛАЦИЯ: Если ты не можешь помочь или родитель просит человека — скажи "Антон уже в курсе и скоро подключится" и НЕ пытайся решить проблему дальше.
5. БЕЗОПАСНОСТЬ: Никогда не давай медицинских, юридических советов.
6. ЯЗЫК: Отвечай на том языке, на котором пишет пользователь (обычно русский).

## Что ты можешь:
- Объяснить как работает подбор
- Помочь найти няню или изменить запрос  
- Рассказать о верификации и безопасности
- Помочь с расписанием и бронированием
- Поддержать и подбодрить`;

// ============================================
// Supabase REST helpers (no SDK, just fetch)
// ============================================
function getSupabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}

// ============================================
// Auth validation — verify JWT and ticket ownership
// ============================================
async function verifyAuth(req: VercelRequest): Promise<{ userId: string } | null> {
  const base = getSupabaseUrl();
  const authHeader = req.headers.authorization;
  if (!base || !authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  try {
    const resp = await fetch(`${base}/auth/v1/user`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    return user?.id ? { userId: user.id } : null;
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
      { headers: getSupabaseHeaders() }
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
  }).catch(() => { /* ignore */ });
}

async function insertAiMessage(ticketId: string, text: string) {
  const base = getSupabaseUrl();
  if (!base || !ticketId || ticketId === 'test') return;

  await fetch(`${base}/rest/v1/support_messages`, {
    method: 'POST',
    headers: getSupabaseHeaders(),
    body: JSON.stringify({ ticket_id: ticketId, sender_type: 'ai_concierge', text }),
  }).catch(() => { /* ignore */ });
}

// ============================================
// Gemini API call
// ============================================
async function callGemini(
  apiKey: string,
  userMessage: string,
  options?: { json?: boolean; systemInstruction?: string; temperature?: number }
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
        console.error(`[Gemini] Model ${model} error ${response.status}:`, JSON.stringify(data?.error || data));
        // Try next model on quota/rate limit or not found
        if (response.status === 404 || response.status === 429 || response.status === 400) continue;
        break;
      }

      const text = data?.candidates?.[0]?.content?.parts
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
// Telegram Escalation (direct Bot API)
// ============================================
async function sendTelegramEscalation(userMessage: string, sentiment: number) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!botToken || !chatId) return;

  const text = `🚨 <b>Эскалация в поддержке Blizko</b>\n\n` +
    `😔 Настроение: <b>${sentiment.toFixed(2)}</b>\n` +
    `💬 Сообщение: <i>${userMessage.slice(0, 200)}</i>\n\n` +
    `<b>Пользователь ждёт ответа человека.</b>`;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
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

  const apiKey = getGeminiApiKey();
  if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

  const body = req.body || {};
  const { message, ticketId } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Verify ticket ownership — user can only interact with their own tickets
  if (ticketId && ticketId !== 'test') {
    const isOwner = await verifyTicketOwnership(ticketId, auth.userId);
    if (!isOwner) return res.status(403).json({ error: 'Forbidden: ticket does not belong to user' });
  }

  const userMessage = message.trim();

  try {
    let sentiment = 0.0;
    let needsHuman = false;
    let draftReply = '';

    try {
      const raw = await callGemini(apiKey, userMessage, {
        json: true,
        temperature: 0.35,
        systemInstruction:
          `${SYSTEM_PROMPT}

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
      sentiment = typeof parsed.sentiment === 'number' ? Math.max(-1, Math.min(1, parsed.sentiment)) : 0.0;
      needsHuman = parsed.needs_human === true;
      draftReply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
    } catch {
      sentiment = 0.0;
    }

    // Keyword escalation check
    const lower = userMessage.toLowerCase();
    const escalationKeywords = ['человек', 'оператор', 'менеджер', 'позови', 'живой', 'не помогает', 'не понимаешь', 'хочу поговорить'];
    if (escalationKeywords.some(kw => lower.includes(kw))) needsHuman = true;

    const shouldEscalate = needsHuman || sentiment < -0.5;
    await updateTicketSentiment(ticketId, sentiment, shouldEscalate);

    if (shouldEscalate) {
      await sendTelegramEscalation(userMessage, sentiment);
      const reply = 'Я понимаю, что ситуация непростая. Антон уже в курсе и скоро подключится лично. Вы в надёжных руках 💛';
      await insertAiMessage(ticketId, reply);
      return res.status(200).json({ reply, sentiment, escalated: true });
    }

    if (!draftReply) {
      return res.status(200).json({
        reply: 'Я здесь! Уточните, пожалуй, вопрос — и я постараюсь помочь.',
        sentiment,
        escalated: false,
      });
    }

    await insertAiMessage(ticketId, draftReply);
    return res.status(200).json({ reply: draftReply, sentiment, escalated: false });

  } catch (e: any) {
    console.error('[AI Support] Error:', e);
    return res.status(500).json({ error: `AI Support error: ${String(e?.message ?? e)}` });
  }
}
