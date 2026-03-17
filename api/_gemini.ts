const DEFAULT_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'] as const;

type GeminiModelKind = 'default' | 'support';
type GeminiInstructionPreset = 'assessment_structured_summary_v1';

const GEMINI_INSTRUCTION_PRESETS: Record<GeminiInstructionPreset, string> = {
  assessment_structured_summary_v1: `You are a moderation assistant for a childcare platform.
Summarize only observable communication patterns from questionnaire answers.
Never diagnose personality, mental health, or hidden traits.
Return ONLY valid JSON with:
{
  "parentSafeSummary": string,
  "moderationNotes": string,
  "extractedSignals": string[],
  "watchouts": string[]
}

Rules:
- parentSafeSummary must be warm, practical, and safe for parents
- moderationNotes should be concise and useful for an internal reviewer
- extractedSignals must be plain-language signal names, not diagnoses
- watchouts must be cautious and evidence-based`,
};

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

export function getGeminiInstruction(preset: unknown): string {
  if (typeof preset !== 'string') return '';
  return GEMINI_INSTRUCTION_PRESETS[preset as GeminiInstructionPreset] || '';
}
