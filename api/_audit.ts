/**
 * Security audit logger — writes events to security_audit_log table.
 * Fire-and-forget: never blocks the main request.
 *
 * Usage:
 *   import { auditLog } from '../_audit.js';
 *   auditLog(req, 'otp_sent', { phone: maskPhone(phone) });
 */
import type { VercelRequest } from '@vercel/node';

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

function getClientIP(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  if (Array.isArray(xff)) return xff[0]?.trim() || 'unknown';
  return req.headers['x-real-ip'] as string || 'unknown';
}

/**
 * Mask phone number for logging: +79991234567 → +7***4567
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return '***';
  return phone.slice(0, 2) + '***' + phone.slice(-4);
}

/**
 * Log a security event (fire-and-forget, never throws)
 */
export function auditLog(
  req: VercelRequest,
  eventType: string,
  details: Record<string, unknown> = {}
): void {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return;

  const row = {
    event_type: eventType,
    ip_address: getClientIP(req),
    phone: details.phone as string || null,
    user_id: details.userId as string || null,
    tma_user_id: details.tmaUserId as number || null,
    details,
  };

  // Fire and forget — don't await, don't block
  fetch(`${url}/rest/v1/security_audit_log`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(row),
  }).catch(() => { /* silently ignore */ });
}
