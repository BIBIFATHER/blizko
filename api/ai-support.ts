/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_cors.js';

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
  options?: { json?: boolean; systemInstruction?: string }
): Promise<string> {
  // Try models in order
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  const preferredModel = (process.env.GEMINI_MODEL || '').trim();
  if (preferredModel) models.unshift(preferredModel);

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

      if (options?.json) {
        payload.generationConfig = { responseMimeType: 'application/json' };
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

  const body = req.body || {};
  const { message, ticketId, userId } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Missing message' });
  }

  const userMessage = message.trim();

  try {
    // ── Step 1: Sentiment analysis ──────────────────────────
    let sentiment = 0.0;
    let needsHuman = false;

    try {
      const sentimentPrompt = `Analyze the emotional tone of this message. Return ONLY JSON: {"score": <float -1.0 to 1.0>, "needs_human": <boolean>}. Set needs_human=true if user asks for a human operator/manager. Message: "${userMessage}"`;
      const raw = await callGemini(apiKey, sentimentPrompt, { json: true });
      const parsed = JSON.parse(raw);
      sentiment = typeof parsed.score === 'number' ? Math.max(-1, Math.min(1, parsed.score)) : 0.0;
      needsHuman = parsed.needs_human === true;
    } catch {
      sentiment = 0.0;
    }

    // Keyword escalation check
    const lower = userMessage.toLowerCase();
    const escalationKeywords = ['человек', 'оператор', 'менеджер', 'позови', 'живой', 'не помогает', 'не понимаешь', 'хочу поговорить'];
    if (escalationKeywords.some(kw => lower.includes(kw))) needsHuman = true;

    // ── Step 2: Update ticket ────────────────────────────────
    const shouldEscalate = needsHuman || sentiment < -0.5;
    await updateTicketSentiment(ticketId, sentiment, shouldEscalate);

    // ── Step 3: Escalation path ──────────────────────────────
    if (shouldEscalate) {
      await sendTelegramEscalation(userMessage, sentiment);
      const reply = 'Я понимаю, что ситуация непростая. Антон уже в курсе и скоро подключится лично. Вы в надёжных руках 💛';
      await insertAiMessage(ticketId, reply);
      return res.status(200).json({ reply, sentiment, escalated: true });
    }

    // ── Step 4: Generate empathetic response ─────────────────
    const reply = await callGemini(apiKey, userMessage, { systemInstruction: SYSTEM_PROMPT });

    if (!reply) {
      return res.status(200).json({
        reply: 'Я здесь! Уточните, пожалуй, вопрос — и я постараюсь помочь.',
        sentiment,
        escalated: false,
      });
    }

    await insertAiMessage(ticketId, reply);
    return res.status(200).json({ reply, sentiment, escalated: false });

  } catch (e: any) {
    console.error('[AI Support] Error:', e);
    return res.status(500).json({ error: `AI Support error: ${String(e?.message ?? e)}` });
  }
}
