// src/core/ai/aiConfig.ts

export const AI_TEXT_MODEL = 'models/gemini-2.5-flash';

// В клиенте ключей быть не должно. Управляем флагом доступности AI через env.
export const AI_CLIENT_ENABLED = String(import.meta.env.VITE_AI_ENABLED ?? 'true') === 'true';

// Флаг "AI настроен" — чтобы UI мог показывать fallback без падения
export const IS_AI_CONFIGURED = AI_CLIENT_ENABLED;

// Если вдруг где-то нужно отображать статус
export const AI_STATUS_MESSAGE = IS_AI_CONFIGURED
  ? 'AI configured (server-side)'
  : 'AI is disabled (VITE_AI_ENABLED=false)';
