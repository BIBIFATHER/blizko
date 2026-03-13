import { apiFetch } from '../api/apiFetch';

export type AITextResponse = { text: string };

type AIMessage = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};

export type AIRequestOptions = {
  systemPrompt?: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: unknown;
};

async function callAi(messages: AIMessage[], options?: AIRequestOptions): Promise<string> {
  const prompt = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  if (!prompt.trim()) return '';

  const { ok, status, data } = await apiFetch<AITextResponse>('/api/ai', {
    method: 'POST',
    body: {
      prompt,
      messages,
      responseMimeType: options?.responseMimeType,
      responseSchema: options?.responseSchema,
    },
  });

  if (!ok) {
    const errPayload = data as any;
    const details = errPayload?.details?.error?.message || errPayload?.error || `HTTP ${status}`;

    if (status === 429) {
      throw new Error(`RATE_LIMIT: ${details}`);
    }

    throw new Error(`AI request failed (${status}): ${details}`);
  }

  return data.text ?? '';
}

export async function aiText(prompt: string, options?: AIRequestOptions): Promise<string> {
  if (!prompt?.trim()) return '';

  const messages: AIMessage[] = [];

  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });
  return callAi(messages, options);
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function aiImage(file: File, prompt: string, options?: AIRequestOptions): Promise<string> {
  const imageDataUrl = await fileToDataUrl(file);

  const messages: AIMessage[] = [
    {
      role: 'user',
      content: `${prompt}\n\n[image_data_url]\n${imageDataUrl}`,
    },
  ];

  if (options?.systemPrompt) {
    messages.unshift({ role: 'system', content: options.systemPrompt });
  }

  return callAi(messages, options);
}
