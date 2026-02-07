/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractPrompt(body: any): string {
  const directPrompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (directPrompt) return directPrompt;

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const fromMessages = messages
    .slice()
    .reverse()
    .find((m: any) => m?.role === 'user' && typeof m?.content === 'string')?.content;

  return String(fromMessages ?? '').trim();
}

function getModels(): string[] {
  const preferred = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  const fallback = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  return Array.from(new Set([preferred, ...fallback]));
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
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

  const prompt = extractPrompt(req.body);
  if (!prompt) return res.status(400).json({ error: 'Empty prompt' });

  const models = getModels();
  let lastStatus = 500;
  let lastError = 'Unknown AI provider error';

  try {
    for (const model of models) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const { response, data } = await callGemini(apiKey, model, prompt);

          if (response.ok) {
            const text =
              data?.candidates?.[0]?.content?.parts
                ?.map((p: any) => p?.text)
                .filter(Boolean)
                .join('') ?? '';

            return res.status(200).json({ text });
          }

          lastStatus = response.status;
          lastError =
            data?.error?.message ||
            data?.error ||
            `Provider error (${response.status})`;

          const shouldRetry = RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES;
          if (shouldRetry) {
            await sleep(300 * (attempt + 1));
            continue;
          }

          // if model likely unavailable/quota-specific, try next model
          if (response.status === 404 || response.status === 429) {
            break;
          }

          return res.status(response.status).json({ error: lastError });
        } catch (err: any) {
          const isAbort = err?.name === 'AbortError';
          lastStatus = 504;
          lastError = isAbort ? 'AI provider timeout' : `AI provider request failed: ${String(err?.message ?? err)}`;

          const shouldRetry = attempt < MAX_RETRIES;
          if (shouldRetry) {
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
