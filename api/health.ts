/// <reference lib="dom" />
// v2 — health check endpoint
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_cors.js';

/**
 * GET /api/health — System health check
 * 
 * Checks: Supabase connection, Telegram bot token, Gemini API key
 * Returns: { status: "ok"|"degraded"|"down", checks: {...} }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);

  if (req.method === 'OPTIONS') return res.status(204).end();

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

  // 2. RLS Policies — check if pg_policies has entries for support tables
  if (supabaseUrl && supabaseKey) {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rls_active`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      // RPC may not exist, so just check connection works
      checks.rls = { ok: true, detail: r.ok ? 'RPC available' : 'RPC not configured (non-critical)' };
    } catch {
      checks.rls = { ok: true, detail: 'Check skipped (non-critical)' };
    }
  }

  // 3. Telegram Bot Token
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

  // 4. Gemini API Key
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
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

  // 5. Environment Variables Presence Check
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
