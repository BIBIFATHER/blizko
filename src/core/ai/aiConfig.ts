// src/core/ai/aiConfig.ts

export const AI_TEXT_MODEL = 'models/gemini-2.5-flash';

export const GEMINI_API_KEY: string | undefined = import.meta.env.VITE_GEMINI_API_KEY;

// Флаг "AI настроен" — чтобы UI мог показывать fallback без падения
export const IS_AI_CONFIGURED = Boolean(GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 0);

// Если вдруг где-то нужно отображать статус
export const AI_STATUS_MESSAGE = IS_AI_CONFIGURED
  ? 'AI configured'
  : 'AI is not configured (VITE_GEMINI_API_KEY is missing)';
