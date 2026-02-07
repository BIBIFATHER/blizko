export type AITextResponse = { text: string };

export async function aiText(prompt: string): Promise<string> {
  const messages = [{ role: 'user', content: prompt }];

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AI request failed (${res.status}): ${errText || res.statusText}`);
  }

  const data = (await res.json()) as AITextResponse;
  return data.text ?? '';
}
