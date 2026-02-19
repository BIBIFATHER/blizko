import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function envWithLocalFallback(key: string): string | undefined {
  const direct = process.env[key];
  if (direct) return direct;
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const raw = fs.readFileSync(envPath, 'utf8');
    const m = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m?.[1]?.trim();
  } catch {
    return undefined;
  }
}

export function getServiceSupabase() {
  const url = envWithLocalFallback('SUPABASE_URL');
  const key = envWithLocalFallback('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
