/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type BodyLike = {
  prompt?: string;
  messages?: Array<{ role?: string; content?: string }>;
  responseMimeType?: string;
  responseSchema?: unknown;
};

function extractUserContent(body: BodyLike): string {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const fromMessages = messages
    .slice()
    .reverse()
    .find((m) => m?.role === 'user' && typeof m?.content === 'string')?.content;

  if (fromMessages && fromMessages.trim()) return fromMessages.trim();

  const directPrompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  return directPrompt;
}

function parseImagePayload(userContent: string): {
  text: string;
  image?: { mimeType: string; data: string };
} {
  const marker = '[image_data_url]';
  const idx = userContent.indexOf(marker);
  if (idx === -1) return { text: userContent };

  const text = userContent.slice(0, idx).trim();
  const tail = userContent.slice(idx + marker.length).trim();
  const m = tail.match(/^data:(.+?);base64,([A-Za-z0-9+/=\n\r]+)$/s);
  if (!m) return { text: userContent };

  return {
    text,
    image: {
      mimeType: m[1],
      data: m[2].replace(/\s+/g, ''),
    },
  };
}

function getModels(): string[] {
  const preferred = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  const fallback = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  return Array.from(new Set([preferred, ...fallback]));
}

async function callGemini(apiKey: string, model: string, body: BodyLike): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const userContent = extractUserContent(body);
    const parsed = parseImagePayload(userContent);

    const parts: any[] = [];
    if (parsed.text) parts.push({ text: parsed.text });
    if (parsed.image) {
      parts.push({
        inlineData: {
          mimeType: parsed.image.mimeType,
          data: parsed.image.data,
        },
      });
    }

    const payload: any = {
      contents: [{ role: 'user', parts: parts.length ? parts : [{ text: userContent }] }],
    };

    if (body.responseMimeType || body.responseSchema) {
      payload.generationConfig = {
        ...(body.responseMimeType ? { responseMimeType: body.responseMimeType } : {}),
        ...(body.responseSchema ? { responseSchema: body.responseSchema } : {}),
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY on server' });

  const body = (req.body || {}) as BodyLike;
  const userContent = extractUserContent(body);
  if (!userContent) return res.status(400).json({ error: 'Empty prompt' });

  const models = getModels();
  let lastStatus = 500;
  let lastError = 'Unknown AI provider error';

  try {
    for (const model of models) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const { response, data } = await callGemini(apiKey, model, body);

          if (response.ok) {
            const text =
              data?.candidates?.[0]?.content?.parts
                ?.map((p: any) => p?.text)
                .filter(Boolean)
                .join('') ?? '';

            return res.status(200).json({ text });
          }

          lastStatus = response.status;
          lastError = data?.error?.message || data?.error || `Provider error (${response.status})`;

          const shouldRetry = RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES;
          if (shouldRetry) {
            await sleep(300 * (attempt + 1));
            continue;
          }

          if (response.status === 404 || response.status === 429) break;

          return res.status(response.status).json({ error: lastError, details: data });
        } catch (err: any) {
          const isAbort = err?.name === 'AbortError';
          lastStatus = 504;
          lastError = isAbort ? 'AI provider timeout' : `AI provider request failed: ${String(err?.message ?? err)}`;

          if (attempt < MAX_RETRIES) {
            await sleep(300 * (attempt + 1));
            continue;
          }

          break;
        }
      }
    }

    return res.status(lastStatus).json({ error: lastError });
  } catch (e: any) {
    return res.status(500).json({ error: `Server error: ${String(e?.message ?? e)}` });
  }
}
