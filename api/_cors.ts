import type { VercelResponse } from '@vercel/node';

function normalizeOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function setCors(reqOrigin: string | undefined, res: VercelResponse) {
  const allowlist = normalizeOrigins(process.env.CORS_ALLOW_ORIGINS);
  if (allowlist.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (reqOrigin && allowlist.includes(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Notify-Token');
}
