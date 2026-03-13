/**
 * Telegram Mini App client-side helper.
 * Detects TMA context, extracts initData, and provides auth headers.
 *
 * Usage:
 *   import { isTMA, getTmaHeaders, getTmaUser } from './tma-validate';
 *
 *   // Add to fetch calls
 *   fetch('/api/ai-support', { headers: { ...getTmaHeaders() } });
 *
 *   // Check if running inside TMA
 *   if (isTMA()) { ... }
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
          };
          auth_date: number;
          hash: string;
          query_id?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
        themeParams: Record<string, string>;
        colorScheme: 'light' | 'dark';
        viewportHeight: number;
        viewportStableHeight: number;
        isExpanded: boolean;
        platform: string;
        version: string;
      };
    };
  }
}

/**
 * Check if running inside Telegram Mini App
 */
export function isTMA(): boolean {
  return Boolean(window.Telegram?.WebApp?.initData);
}

/**
 * Get Telegram WebApp instance (or null if not in TMA)
 */
export function getTmaWebApp() {
  return window.Telegram?.WebApp ?? null;
}

/**
 * Get headers to send with API requests for TMA authentication.
 * Returns empty object if not in TMA context.
 */
export function getTmaHeaders(): Record<string, string> {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) return {};
  return { 'X-TMA-Init-Data': initData };
}

/**
 * Get TMA user info (parsed from initDataUnsafe — NOT validated server-side)
 * Always validate on server with _tma.ts for security-critical operations.
 */
export function getTmaUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
}

/**
 * Get TMA user's Telegram ID (or null)
 */
export function getTmaTelegramId(): number | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null;
}

/**
 * Initialize TMA: call ready() and expand()
 */
export function initTma() {
  const webapp = getTmaWebApp();
  if (webapp) {
    webapp.ready();
    webapp.expand();
  }
}
