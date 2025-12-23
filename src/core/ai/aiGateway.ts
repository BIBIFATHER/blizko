// src/core/ai/aiGateway.ts

export type AITextResponse = { text: string };

// Текстовый запрос (чат/анализ)
export async function aiText(prompt: string): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'text', prompt }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AI request failed (${res.status}): ${errText || res.statusText}`);
  }

  const data = (await res.json()) as AITextResponse;
  return data.text ?? '';
}

// Генерация/анализ изображения (если нужно в проекте)
export async function aiImage(prompt: string, imageBase64?: string): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'image', prompt, imageBase64 }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AI image request failed (${res.status}): ${errText || res.statusText}`);
  }

  const data = (await res.json()) as { result?: string; text?: string };
  return data.result ?? data.text ?? '';
}
