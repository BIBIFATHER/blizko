import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyBearerAdmin } from './_auth.js';
import { setCors } from './_cors.js';

/**
 * GET /api/health — System health check
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const healthToken = process.env.HEALTHCHECK_TOKEN || '';
  const incomingToken = String(req.headers['x-health-token'] || '').trim();
  const isAuthorizedByToken = Boolean(healthToken && incomingToken === healthToken);
  const adminUser = isAuthorizedByToken ? null : await verifyBearerAdmin(req);

  if (!isAuthorizedByToken && !adminUser) {
    return res.status(404).json({ error: 'Not found' });
  }

  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1. Supabase Connection
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    checks.supabase = { ok: false, detail: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
  } else {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/support_tickets?select=id&limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });
      checks.supabase = { ok: r.ok, detail: r.ok ? 'Connected' : `HTTP ${r.status}` };
    } catch (e: any) {
      checks.supabase = { ok: false, detail: e?.message || 'Connection failed' };
    }
  }

  // 2. Telegram Bot Token
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    checks.telegram = { ok: false, detail: 'Missing TELEGRAM_BOT_TOKEN' };
  } else {
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data: any = await r.json().catch(() => ({}));
      checks.telegram = {
        ok: data?.ok === true,
        detail: data?.ok ? `Bot: @${data.result?.username}` : 'Invalid token',
      };
    } catch (e: any) {
      checks.telegram = { ok: false, detail: e?.message || 'Connection failed' };
    }
  }

  // 3. Gemini API Key
  const geminiKey = process.env.GEMINI_API_KEY || '';
  if (!geminiKey) {
    checks.gemini = { ok: false, detail: 'Missing GEMINI_API_KEY' };
  } else {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      checks.gemini = {
        ok: r.ok,
        detail: r.ok ? 'Key valid' : `HTTP ${r.status} — Invalid key`,
      };
    } catch (e: any) {
      checks.gemini = { ok: false, detail: e?.message || 'Connection failed' };
    }
  }

  // 4. Environment Variables
  const requiredEnvs = [
    'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_ADMIN_CHAT_ID',
  ];
  const missingEnvs = requiredEnvs.filter(k => !process.env[k]);
  checks.env_vars = {
    ok: missingEnvs.length === 0,
    detail: missingEnvs.length === 0 ? 'All present' : `Missing: ${missingEnvs.join(', ')}`,
  };

  // Status
  const allOk = Object.values(checks).every(c => c.ok);
  const anyDown = checks.supabase?.ok === false || checks.gemini?.ok === false;
  const status = allOk ? 'ok' : anyDown ? 'down' : 'degraded';

  return res.status(status === 'down' ? 503 : 200).json({
    status,
    timestamp: new Date().toISOString(),
    checks,
  });
}
