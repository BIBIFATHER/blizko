import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_cors.js';
import { verifyBearerAdmin } from './_auth.js';
import { getServiceSupabase } from './auth/_supabase.js';

const DOCS_BUCKET = 'nanny-documents';
const SIGNED_URL_TTL = 300; // seconds

// Куратор/админ просматривает документ няни из PRIVATE-бакета.
// Owner-read RLS не пускает не-владельца, поэтому подпись делается server-side
// через service_role. Доступ только для админов (verifyBearerAdmin).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await verifyBearerAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Forbidden' });

  const path = String(req.query.path || '').trim();
  if (!path || path.startsWith('/') || path.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const supabase = getServiceSupabase();
  if (!supabase) return res.status(500).json({ error: 'Storage unavailable' });

  try {
    const { data, error } = await supabase.storage
      .from(DOCS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (error || !data?.signedUrl) {
      console.warn('sign-doc failed:', error?.message);
      return res.status(404).json({ error: 'Document not found' });
    }
    return res.status(200).json({ url: data.signedUrl });
  } catch (e) {
    console.error('sign-doc error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
}
