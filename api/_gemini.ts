const DEFAULT_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'] as const;

type GeminiModelKind = 'default' | 'support';

export function getGeminiApiKey(): string {
  return (process.env.GEMINI_API_KEY || '').trim();
}

export function getGeminiModels(kind: GeminiModelKind = 'default'): string[] {
  const configuredModel = (
    kind === 'support'
      ? process.env.GEMINI_SUPPORT_MODEL || process.env.GEMINI_MODEL
      : process.env.GEMINI_MODEL
  )?.trim();

  const preferred = configuredModel || DEFAULT_GEMINI_MODELS[0];
  return Array.from(new Set([preferred, ...DEFAULT_GEMINI_MODELS]));
}

export function normalizeGeminiTemperature(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(2, Math.max(0, value));
}
