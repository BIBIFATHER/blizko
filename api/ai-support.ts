/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_cors';
import { createClient } from '@supabase/supabase-js';

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
1. КОНТЕКСТ: Тебе будет дана информация о текущих мэтчах/нянях пользователя. Используй её проактивно. Пример: "Вижу, что вы недавно нашли няню Анну — как впечатления?"
2. ЛАКОНИЧНОСТЬ: Отвечай кратко (2-4 предложения), не пиши эссе.
3. ЭМПАТИЯ: Если родитель расстроен — сначала признай его чувства, потом предлагай решение.
4. ЭСКАЛАЦИЯ: Если ты не можешь помочь или родитель просит человека — скажи "Антон уже в курсе и скоро подключится" и НЕ пытайся решить проблему дальше.
5. БЕЗОПАСНОСТЬ: Никогда не давай медицинских, юридических советов. Перенаправляй к специалистам.
6. ЯЗЫК: Отвечай на том языке, на котором пишет пользователь (обычно русский).

## Что ты можешь:
- Объяснить как работает подбор
- Помочь найти няню или изменить запрос
- Рассказать о верификации и безопасности
- Помочь с расписанием и бронированием
- Поддержать и подбодрить
`;

// ============================================
// Sentiment Analysis Prompt
// ============================================
const SENTIMENT_PROMPT = `Analyze the emotional tone of this message from a parent looking for a nanny.
Return ONLY a JSON object: {"score": <float from -1.0 to 1.0>, "needs_human": <boolean>}
-1.0 = very angry/distressed, 0.0 = neutral, 1.0 = very happy/grateful.
Set needs_human to true if the user explicitly asks for a human operator, manager, or says the bot is not helping.
Message: `;

// ============================================
// Supabase Admin Client (Service Role)
// ============================================
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

// ============================================
// Fetch user context from DB
// ============================================
async function fetchUserContext(userId: string): Promise<string> {
  const sb = getSupabaseAdmin();
  if (!sb) return 'Контекст недоступен.';

  const parts: string[] = [];

  // Get parent requests
  try {
    const { data: parents } = await sb
      .from('parents')
      .select('payload')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (parents && parents.length > 0) {
      const p = parents[0].payload;
      parts.push(`Родитель: ${p.parentName || 'Неизвестно'}, район: ${p.city || p.district || '—'}, дети: ${(p.childAges || []).join(', ') || '—'}`);
    }
  } catch { /* ignore */ }

  // Get matched nannies (latest)
  try {
    const { data: nannies } = await sb
      .from('nannies')
      .select('payload')
      .order('created_at', { ascending: false })
      .limit(5);

    if (nannies && nannies.length > 0) {
      const names = nannies.map(n => n.payload?.name || 'Без имени').slice(0, 3);
      parts.push(`Доступные няни в системе: ${names.join(', ')}`);
    }
  } catch { /* ignore */ }

  return parts.length > 0 ? parts.join('\n') : 'Пользователь пока не оставил заявку.';
}

// ============================================
// Call Gemini API
// ============================================
async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  options?: { responseMimeType?: string }
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload: any = {
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] },
      ],
    };

    if (options?.responseMimeType) {
      payload.generationConfig = { responseMimeType: options.responseMimeType };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    return data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('') || '';
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================
// Send Telegram Escalation
// ============================================
async function sendTelegramEscalation(userMessage: string, sentiment: number) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!botToken || !chatId) return;

  const text = `🚨 <b>Эскалация в поддержке Blizko</b>\n\n` +
    `😔 Настроение: <b>${sentiment.toFixed(2)}</b>\n` +
    `💬 Сообщение: <i>${userMessage.slice(0, 200)}</i>\n\n` +
    `<b>Пользователь ждёт ответа человека.</b>`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (e) {
    console.error('[Telegram Escalation] Failed:', e);
  }
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
    // Step 1: Analyze sentiment
    let sentiment = 0.0;
    let needsHuman = false;

    try {
      const sentimentRaw = await callGemini(
        apiKey,
        SENTIMENT_PROMPT,
        userMessage,
        { responseMimeType: 'application/json' }
      );
      const parsed = JSON.parse(sentimentRaw);
      sentiment = typeof parsed.score === 'number' ? parsed.score : 0.0;
      needsHuman = parsed.needs_human === true;
    } catch {
      // Default to neutral if analysis fails
      sentiment = 0.0;
    }

    // Keyword escalation check
    const escalationKeywords = ['человек', 'оператор', 'менеджер', 'позовите', 'живой', 'не помогает', 'не понимаете'];
    const lowerMsg = userMessage.toLowerCase();
    if (escalationKeywords.some(kw => lowerMsg.includes(kw))) {
      needsHuman = true;
    }

    // Step 2: Update ticket sentiment in DB
    const sb = getSupabaseAdmin();
    if (sb && ticketId) {
      const updateData: any = { sentiment_score: sentiment, updated_at: new Date().toISOString() };
      if (needsHuman || sentiment < -0.5) {
        updateData.status = 'human_escalated';
      }
      await sb.from('support_tickets').update(updateData).eq('id', ticketId);
    }

    // Step 3: If escalation needed, notify Telegram & return empathetic handover
    if (needsHuman || sentiment < -0.5) {
      await sendTelegramEscalation(userMessage, sentiment);

      // Save AI message to DB
      if (sb && ticketId) {
        await sb.from('support_messages').insert({
          ticket_id: ticketId,
          sender_type: 'ai_concierge',
          text: 'Я понимаю, что ситуация непростая. Антон уже в курсе и скоро подключится лично. Вы в надёжных руках 💛',
        });
      }

      return res.status(200).json({
        reply: 'Я понимаю, что ситуация непростая. Антон уже в курсе и скоро подключится лично. Вы в надёжных руках 💛',
        sentiment,
        escalated: true,
      });
    }

    // Step 4: Fetch context & generate AI response
    const context = userId ? await fetchUserContext(userId) : 'Контекст недоступен.';
    const fullPrompt = `${SYSTEM_PROMPT}\n\n## Контекст пользователя:\n${context}\n\n## Пользователь пишет:`;
    const aiReply = await callGemini(apiKey, fullPrompt, userMessage);

    // Save AI message to DB
    if (sb && ticketId) {
      await sb.from('support_messages').insert({
        ticket_id: ticketId,
        sender_type: 'ai_concierge',
        text: aiReply,
      });
    }

    return res.status(200).json({
      reply: aiReply,
      sentiment,
      escalated: false,
    });
  } catch (e: any) {
    console.error('[AI Support] Error:', e);
    return res.status(500).json({ error: `AI Support error: ${String(e?.message ?? e)}` });
  }
}
