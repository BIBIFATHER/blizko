// Centralized AI configuration for Blizko

export const GEMINI_TEXT_MODEL = "gemini-3-flash-preview" as const;
export const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image" as const;

/**
 * Reads Gemini API key from environment.
 *
 * - Vite: import.meta.env.GEMINI_API_KEY
 * - Fallback: process.env.GEMINI_API_KEY (non-vite runtimes)
 */
export function getGeminiApiKey(): string | null {
  // Vite style
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viteKey = (import.meta as any)?.env?.GEMINI_API_KEY as
    | string
    | undefined;
  if (viteKey && viteKey.trim()) return viteKey.trim();

  // Fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeKey = (process as any)?.env?.GEMINI_API_KEY as string | undefined;
  if (nodeKey && nodeKey.trim()) return nodeKey.trim();

  return null;
}
