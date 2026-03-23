/**
 * Centralized API fetch wrapper with automatic TMA header injection.
 * All client-side API calls should use this instead of raw fetch('/api/...').
 *
 * Features:
 * - Auto-injects X-TMA-Init-Data header when running inside Telegram Mini App
 * - Consistent error handling
 * - Type-safe responses
 *
 * Usage:
 *   import { apiFetch } from '@/core/api/apiFetch';
 *   const data = await apiFetch('/api/ai-support', { method: 'POST', body: ... });
 */
import { getTmaHeaders } from '../auth/tma-validate';

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown> | string;
}

export async function apiFetch<T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const { body, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getTmaHeaders(), // Auto-inject TMA initData
    ...(customHeaders as Record<string, string> || {}),
  };

  const fetchOptions: RequestInit = {
    ...rest,
    headers,
  };

  if (body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);
  const data = await res.json().catch(() => ({} as T));

  return { ok: res.ok, status: res.status, data };
}

/**
 * POST shorthand
 */
export async function apiPost<T = any>(
  url: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>
): Promise<{ ok: boolean; status: number; data: T }> {
  return apiFetch<T>(url, { method: 'POST', body, headers });
}
