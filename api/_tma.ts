/**
 * Telegram Mini App (TMA) initData HMAC-SHA256 validation.
 * Verifies that requests genuinely come from Telegram WebApp.
 *
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Usage (server-side):
 *   import { validateTmaInitData, TmaUser } from './_tma.js';
 *   const user = validateTmaInitData(req.headers['x-tma-init-data'] as string);
 *   if (!user) return res.status(401).json({ error: 'Invalid TMA signature' });
 */
import { createHmac } from 'crypto';

export interface TmaUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TmaValidationResult {
  user: TmaUser;
  authDate: number;
  queryId?: string;
  hash: string;
}

/**
 * Validates Telegram Mini App initData string.
 * Returns parsed user data if valid, null if invalid.
 *
 * @param initData - The raw initData string from Telegram WebApp
 * @param botToken - Telegram bot token (defaults to TELEGRAM_BOT_TOKEN env)
 * @param maxAgeSeconds - Maximum age of auth_date (default: 300 = 5 minutes)
 */
export function validateTmaInitData(
  initData: string | undefined | null,
  botToken?: string,
  maxAgeSeconds = 300
): TmaValidationResult | null {
  if (!initData) return null;

  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  try {
    // 1. Parse URL-encoded params
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    // 2. Build data-check-string (sorted, without hash)
    params.delete('hash');
    const entries = Array.from(params.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    // 3. Compute HMAC-SHA256
    // secret_key = HMAC-SHA256("WebAppData", bot_token)
    const secretKey = createHmac('sha256', 'WebAppData').update(token).digest();
    const computedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // 4. Constant-time comparison
    if (computedHash.length !== hash.length) return null;
    let diff = 0;
    for (let i = 0; i < computedHash.length; i++) {
      diff |= computedHash.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    if (diff !== 0) return null;

    // 5. Check auth_date freshness (anti-replay)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > maxAgeSeconds) return null;

    // 6. Parse user
    const userStr = params.get('user');
    if (!userStr) return null;
    const user: TmaUser = JSON.parse(userStr);

    return {
      user,
      authDate,
      queryId: params.get('query_id') || undefined,
      hash,
    };
  } catch {
    return null;
  }
}
