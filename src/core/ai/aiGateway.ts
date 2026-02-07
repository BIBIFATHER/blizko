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
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, ...options }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AI request failed (${res.status}): ${errText || res.statusText}`);
  }

  const data = (await res.json()) as AITextResponse;
  return data.text ?? '';
}

export async function aiText(prompt: string, options?: AIRequestOptions): Promise<string> {
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
