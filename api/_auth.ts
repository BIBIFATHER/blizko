import type { VercelRequest } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export function envWithLocalFallback(key: string): string | undefined {
  const direct = process.env[key];
  if (direct) return direct;

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const raw = fs.readFileSync(envPath, 'utf8');
    const match = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

export function getServerEnv() {
  return {
    supabaseUrl: envWithLocalFallback('SUPABASE_URL'),
    supabaseServiceRoleKey: envWithLocalFallback('SUPABASE_SERVICE_ROLE_KEY'),
    supabaseAnonKey: envWithLocalFallback('SUPABASE_ANON_KEY'),
    adminEmails: (envWithLocalFallback('ADMIN_EMAILS') || envWithLocalFallback('ADMIN_EMAIL') || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  };
}

export type VerifiedUser = {
  id: string;
  email: string | null;
};

export async function verifyBearerUser(req: VercelRequest): Promise<VerifiedUser | null> {
  const { supabaseUrl, supabaseAnonKey } = getServerEnv();
  const auth = String(req.headers.authorization || '');
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';

  if (!supabaseUrl || !supabaseAnonKey || !token) {
    return null;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const user = await response.json().catch(() => ({}));
    return user?.id
      ? {
          id: String(user.id),
          email: user?.email ? String(user.email).toLowerCase() : null,
        }
      : null;
  } catch {
    return null;
  }
}

export async function verifyBearerAdmin(req: VercelRequest): Promise<VerifiedUser | null> {
  const user = await verifyBearerUser(req);
  if (!user) return null;

  const { adminEmails } = getServerEnv();
  if (!user.email || !adminEmails.includes(user.email)) {
    return null;
  }

  return user;
}
