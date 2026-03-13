/**
 * In-memory rate limiter for Vercel serverless functions.
 * Uses a sliding window approach. State resets on cold starts (acceptable for edge protection).
 *
 * Usage:
 *   import { rateLimit, RateLimitResult } from './_rate-limit.js';
 *   const check = rateLimit(req, { windowMs: 60_000, max: 10 });
 *   if (!check.ok) return res.status(429).json({ error: 'Too many requests' });
 */
import type { VercelRequest } from '@vercel/node';

interface RateLimitOptions {
  /** Time window in milliseconds (default: 60_000 = 1 minute) */
  windowMs?: number;
  /** Max requests per window (default: 10) */
  max?: number;
  /** Key prefix to separate different limiters */
  prefix?: string;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

// In-memory store — resets on cold start, which is fine for basic protection
const store = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries every 5 minutes to prevent memory leaks
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return; // 5 min
  lastCleanup = now;
  for (const [key, val] of store.entries()) {
    if (now > val.resetAt) store.delete(key);
  }
}

function getClientIP(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  if (Array.isArray(xff)) return xff[0]?.trim() || 'unknown';
  return req.headers['x-real-ip'] as string || 'unknown';
}

export function rateLimit(
  req: VercelRequest,
  opts: RateLimitOptions = {}
): RateLimitResult {
  const { windowMs = 60_000, max = 10, prefix = '' } = opts;
  const ip = getClientIP(req);
  const key = `${prefix}:${ip}`;
  const now = Date.now();

  cleanup();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfterMs: 0 };
  }

  entry.count++;

  if (entry.count > max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  return { ok: true, remaining: max - entry.count, retryAfterMs: 0 };
}
